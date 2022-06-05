import { Schema, model, connect } from "mongoose";

const deviceSchema = new Schema({
  label: {
    type: String,
    required: true,
  },
  cid: {
    type: String,
    required: true,
  },
  auth: {
    type: Boolean,
    required: true,
    default: false,
  },
  status: {
    type: String,
    required: true,
    default: "disconnected",
  },
  mode: {
    type: String,
    required: true,
    default: "Legacy",
  },
  lastConnected: {
    type: Date,
    required: false,
  },
  ppURL: {
    type: String,
    required: false,
  },
  pushName: {
    type: String,
    required: false,
  },
  phoneNumber: {
    type: String,
    required: false,
  },
  browserClient: {
    type: String,
    required: false,
  },
});

const Device = model("Device", deviceSchema);
export default Device;
