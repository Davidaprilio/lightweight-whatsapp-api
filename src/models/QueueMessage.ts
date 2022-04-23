import { Schema, model, connect } from "mongoose";

interface IQueueMessage {
  cid: string;
  type: string;
  phone: string;
  button: any;
  responseStatus: number;
  responseMessage: string;
  text: string;
  media: string;
  queId: string;
  delay: number;
  priority: number;
}

export const queueStatus = {
  waiting: {
    code: 0,
    msg: "waiting",
  },
  sent: {
    code: 1,
    msg: "sent",
  },
  failed: {
    code: 2,
    msg: "failed",
  },
  notRegistered: {
    code: 3,
    msg: "not registered",
  },
  formatInvalid: {
    code: 4,
    msg: "format invalid",
  },
};

const queueMessageSchema = new Schema<IQueueMessage>({
  cid: String,
  phone: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    default: "text",
  },
  text: String,
  button: Object,
  media: String,
  responseStatus: {
    type: Number,
    required: true,
    default: queueStatus.waiting.code,
  },
  responseMessage: {
    type: String,
    default: queueStatus.waiting.msg,
  },
  queId: String,
  delay: {
    type: Number,
    default: 1,
  },
  priority: {
    type: Number,
    required: true,
    default: 10,
  },
});

const QueueMessage = model<IQueueMessage>("QueueMessage", queueMessageSchema);
export default QueueMessage;
