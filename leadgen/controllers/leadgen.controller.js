const { firebase } = require("googleapis/build/src/apis/firebase");
const {
  firestore,
  auth,
  storage,
  admin,
} = require("../../config/admin.config");

const axios = require("axios").default;

const submitForm = async (req, res) => {
  try {
    const { name, phone } = req.body;

    // Validate input
    if (!name || !phone) {
      return res.status(400).send("name and phone are required");
    }

    // Check for existing lead by phone number
    const lead = await firestore
      .collection("leads")
      .where("phone", "==", phone)
      .get();

    if (!lead.empty) {
      return res.status(400).json({
        message: "Lead already exists",
      });
    }

    // Create new lead document in Firestore
    const leadRef = firestore.collection("leads").doc();

    // Get current date in Indian time zone
    let date = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    date =
      date.getDate() + "-" + (date.getMonth() + 1) + "-" + date.getFullYear();

    // Save lead data to Firestore
    await leadRef.set({
      name,
      phone,
      timestamp: new Date(),
      date,
    });

    //Get tokenId from firestore saved in /token/token
    let { accessToken } = (
      await firestore.collection("token").doc("token").get()
    ).data();

    //Push Lead data to CRM CentraHub
    const userAgent = req.get("User-Agent");
    try {
      const { id, errors, status } = await pushLeadToCentraHub(
        phone,
        name,
        `${accessToken}`,
        userAgent
      );

      // Handle CentraHub submission failure
      if (status == 0) {
        // Save Centrahub failure to firestore
        const firestoreResponse = await firestore
          .collection("leads")
          .doc(leadRef.id)
          .set(
            {
              error: errors,
              isSavedToCentrahub: false,
            },
            { merge: true }
          );

        if (firestoreResponse.error) {
          return res.status(400).json({
            message:
              "Error while saving lead to firestore after centrahub submission failure",
          });
        }
        return res.status(400).json({
          message: "Centrahub submission failed, error saved in firestore",
        });
      }

      // Handle successful CentraHub submission
      if (status == 1) {
        // Save Centrahub Id to firestore
        const firestoreResponse = await firestore
          .collection("leads")
          .doc(leadRef.id)
          .set(
            {
              centrahubId: id,
              isSavedToCentrahub: true,
            },
            { merge: true }
          );

        if (firestoreResponse.error) {
          return res.status(400).json({
            message:
              "Error while saving lead to firestore after centrahub submission success",
          });
        }

        return res.status(200).json({
          message: "Lead submitted successfully",
        });
      }
    } catch (error) {
      console.error(error);
      return res
        .status(400)
        .json({ error: "An error occurred while saving lead" });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(400)
      .json({ error: "An error occurred while saving lead" });
  }
};

const pushLeadToCentraHub = async (phone, name, accessToken, userAgent) => {
  // Prepare data for CentraHub API
  const data = {
    records: [
      {
        Company: name,
        Phone: phone,
        CampaignId__name: "Facebook",
        LeadState__name: "Qualified",
        LeadNo: "1",
        LeadStage__name: "New lead",
        LeadSubstage__name: "Fresh Lead",
      },
    ],
  };

  // Prepare request configuration
  let config = {
    method: "post",
    url: "https://tempsehatup.centrahubcrm.com/in/crmservices/rest/modules/V1.0/Leads",
    headers: {
      "Content-Type": "application/json",
      access_token: accessToken,
    },
    data: JSON.stringify(data),
  };
  try {
    const response = await axios.request(config);
    const { status, errors } = response.data;

    //Error returned from centrahub while creating lead
    if (status == 0) {
      const { errorCode, message } = errors[0];

      //Invalid access token
      if (errorCode == 8005) {
        //Generate new access token
        try {
          const accessToken = await generateAccessToken(userAgent);
          //Save the new access token to firestore
          await firestore
            .collection("token")
            .doc("token")
            .set(accessToken, { merge: true });
          return response.data;
        } catch (error) {
          console.error(
            "Error details:",
            error.response ? error.response.data : error.message
          );
          return error;
        }
      }
    }
    return response.data;
  } catch (error) {
    console.error(
      "Error details:",
      error.response ? error.response.data : error.message
    );
    return error;
  }
};

const generateAccessToken = async (userAgent) => {
  // Prepare data for token request
  const data =
    '{"username":"Utsav.dhariwal@sehatup.com","client_secret":"RFCJNue^KufEYAl1t3gOaL8iL^hghlk0Ars3XWwBkeg=!n","grant_type":"password","client_id":"7m9mFWPxLroaJzV^NmcxRzrdSfd0oU8F74jEc7LkDDE=!n","password":"Centra@123"}';
  let config = {
    method: "POST",
    url: "https://tempsehatup.centrahubcrm.com/in/crmservices/rest/oauth/authorize",
    headers: {
      "User-Agent": userAgent,
    },
    data,
  };

  try {
    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    console.error(
      "Error details:",
      error.response ? error.response.data : error.message
    );
    return error;
  }
};

module.exports = {
  submitForm,
};
