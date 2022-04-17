import express, { Request, Response, NextFunction } from "express";
import fs from "fs";
const deviceController = require("../controllers/deviceController");
const sendMessage = require("../controllers/sendMessage");
import { body } from "express-validator";
import { validate } from "../Main/Validator";
import {
  validateClientConnect,
  validatePhone,
  validateUseClient,
} from "../Main/Validator";

const router = express.Router();
router.get("/get-sesi", deviceController.getSession);
router.post("/cek-nomor", sendMessage.get);

router.post("/device/create", deviceController.create);

router.use("/*", validateUseClient); // Cid dan data Device harus ada

router.post("/device/start", deviceController.start);

router.use("/*", validateClientConnect); // Harus Sudah Connect
router.post("/device/logout", deviceController.logout);

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

router.post(
  "/send/text",
  validate([
    body("text").not().isEmpty().withMessage("text required").trim().escape(),
  ]),
  validatePhone,
  sendMessage.text
);

router.post(
  "/send/button",
  validate([
    body("text").not().isEmpty().withMessage("text required").trim().escape(),
    body("buttons").isArray().withMessage("buttons must by of type 'Array'"),
  ]),
  validatePhone,
  sendMessage.button
);

router.post(
  "/send/contact",
  validate([
    body("name").not().isEmpty().withMessage("name required").trim().escape(),
    body("contacts").isArray().withMessage("contacts must by of type 'Array'"),
  ]),
  validatePhone,
  sendMessage.contact
);

router.all("/*", (req: Request, res: Response) => {
  return res.status(404).json({
    status: false,
    message: "Service Not Found",
    errors: "this end point not found check url again",
  });
});
export default router;
