require("dotenv").config();
import express from "express";
import process from "process";
import mongoose from "mongoose";
import methodOverride from "method-override";

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
process.on("SIGINT", async () => {
  console.log("(SIGINT) Shutting down...");
  // await client.destroy()
  process.exit(0);
});

app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// call Routes
const routes = require("./routes/api");
app.use("/api", routes);

app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
