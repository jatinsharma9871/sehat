const { Router } = require("express");

const { submitForm } = require("../controllers/leadgen.controller");

const leadgenRouter = Router();

// making route for saving lead gen details
leadgenRouter.post("/submitForm", submitForm);

module.exports = { leadgenRouter };
