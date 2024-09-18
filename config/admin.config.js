var admin = require("firebase-admin");

var serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DBURL,
  storageBucket: process.env.BUCKETURL,
});

// Database Refference
const firestore = admin.firestore();

firestore.settings({ ignoreUndefinedProperties: true });

const auth = admin.auth();

const storage = admin.storage();

module.exports = { firestore, auth, admin, storage };
