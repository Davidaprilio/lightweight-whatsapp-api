import express from "express";
import fs from "fs";
import { body } from "express-validator";
const router = express.Router();

import { Client } from "../Main/Client";

let client: Client;
// import WA = require("../app/controllers/device");

// Device Routes
router.delete("/device/reset", (req, res) => {
  console.log("Reset");
  let file = `${req.body.idName}.json`;
  if (fs.existsSync("./session/storage/" + file)) {
    fs.rmSync("./session/storage/" + file, { recursive: true, force: true });
  }
  if (fs.existsSync("./session/auth/" + file)) {
    fs.rmSync("./session/auth/" + file, { recursive: true, force: true });
  }
  return res.json({
    status: true,
  });
});

router.post("/device/start", async (req, res) => {
  console.log("client is starting: ", req.body.idName);
  client = new Client(req.body.idName, req.body.mode);
  await client.startSock();
  return res.json({
    status: true,
  });
});

router.post("/device/logout", (req, res) => {
  console.log("client logout", req.body.idName);
  client.logout();
  return res.json({
    status: true,
  });
});

router.post("/send", async (req, res) => {
  console.log("client logout", req.body.idName);
  const resp = await client.sendMessageWTyping(
    {
      text: req.body.text,
    },
    req.body.phone
  );
  return res.json({
    status: true,
    data: resp,
  });
});

module.exports = router;
