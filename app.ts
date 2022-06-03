require("dotenv").config();
import express from "express";
import bodyParser from "body-parser";
import path from "path";
import process from "process";
import mongoose from "mongoose";
import methodOverride from "method-override";
import Device from "./src/models/Device";
import { handleStart } from "./src/controllers/deviceController";
import apiRoutes from "./src/routes/api";
import webRoutes from "./src/routes/web";

const app = express();
const port: Number = process.env.PORT ? parseInt(process.env.PORT) : 3000;
app.locals.baseURL = process.env.BASE_URL ?? `http://localhost:${port}`;
const withWebManager = process.env.WEB_MANAGER ?? true; // WEB UI TO Manage Your Whatsapp Client
app.use(express.static("resources/public"));
console.log(`${app.locals.baseURL}`);

// Connet to mongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then((result) => console.log("DB ready"))
  .catch((err) => {
    console.error(err);
  });

// Method Overide
app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(express.json()); // for parsing application/json
// app.use(bodyParser.urlencoded({ extended: false })); // for parsing application/x-www-form-urlencoded
// app.use(bodyParser.json()); // for parsing application/json
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/resources/views"));

process.on("SIGINT", async () => {
  console.log("(SIGINT) Shutting down...");
  // await client.destroy()
  process.exit(0);
});

Device.find({ auth: true })
  .then((devices) => {
    devices.forEach((device) => {
      const mode = device.mode != "Legacy";
      console.log("Start " + device.cid);

      handleStart(device.cid, mode);
    });
  })
  .catch((err) => {
    console.error("Starting device", err);
  });

// call Routes
if (withWebManager) {
  console.log(`Web Manager is enabled`);
  app.use("/", webRoutes);
}
app.use("/api", apiRoutes);

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
