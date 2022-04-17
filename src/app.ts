require("dotenv").config();
import express from "express";
import bodyParser from "body-parser";
import process from "process";
import mongoose from "mongoose";
import methodOverride from "method-override";
import routes from "./routes/api";
import Device from "./models/Device";
import { handleStart } from "./controllers/deviceController";

const app = express();
const port: Number = 3000;

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
app.use("/api", routes);

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
