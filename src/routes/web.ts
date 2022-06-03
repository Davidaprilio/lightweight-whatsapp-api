import express, { Request, Response, NextFunction } from "express";
import fs from "fs";
const deviceController = require("../controllers/deviceController");
const sendMessage = require("../controllers/sendMessage");
const userController = require("../controllers/userController");
import { body } from "express-validator";
import { validate } from "../Main/Validator";
import {
  validateClientConnect,
  validatePhone,
  validateUseClient,
} from "../Main/Validator";
const router = express.Router();

router.get("/dashboard", userController.dashboard);
router.get("/clients", deviceController.listDevice);
// router.get("/device/:deviceID", deviceController.view);

export default router;
