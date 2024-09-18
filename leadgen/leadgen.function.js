const { onRequest } = require("firebase-functions/v2/https");

const express = require("express");
const cors = require("cors");

const { leadgenRouter } = require("./routes/leadgen.route");

const leadGenExpressApp = express();

leadGenExpressApp.use(cors({ origin: true }));
leadGenExpressApp.use(express.json());

leadGenExpressApp.use((req, res, next) => {
  console.log("Requested Endpoint: ", req.url);
  next();
});

// Routers for the route
leadGenExpressApp.use("/", leadgenRouter);

const runTimeOps = {
  memory: "512MiB",
  timeoutSeconds: 540,
  region: "asia-south1",
};

// exporting cloud function
module.exports = onRequest(runTimeOps, leadGenExpressApp);
