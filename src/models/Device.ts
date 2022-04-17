import { Schema, model, connect } from "mongoose";

interface IDevice {
  label: string;
  cid: string;
  auth: boolean;
  qrCode: string;
  mode: string;
  lastConnected: Date;
  avatar?: string;
}

const deviceSchema = new Schema<IDevice>({
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
  qrCode: {
    type: String,
    required: false,
    default: null,
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
  avatar: String,
});

const Device = model<IDevice>("Device", deviceSchema);
export default Device;
