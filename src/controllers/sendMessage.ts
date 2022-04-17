import clientSession from "../Main/SessionClient";
import { NextFunction, Request, Response } from "express";
import { check } from "express-validator";
import { validate } from "../Main/Validator";
import CreateMessage from "../Main/CreateMessage";

exports.get = async (req: Request, res: Response) => {
  // Multidevice
  const data = await clientSession[req.body.cid].isRegistWA(req.body.phone);
  return res.json({
    r: data,
  });
};

exports.text = async (req: Request, res: Response) => {
  const Msg = new CreateMessage(clientSession[req.body.cid]);
  const sendMsg = await Msg.text(req.body.text).send(req.body.phone);
  return res
    .status(200)
    .json(createFormatResponseData(sendMsg, req.body.phone));
};

exports.button = async (req: Request, res: Response) => {
  const Msg = new CreateMessage(clientSession[req.body.cid]);
  const sendMsg = await Msg.text(req.body.text)
    .button(req.body.buttons, req.body.footer)
    .send(req.body.phone);
  return res
    .status(200)
    .json(createFormatResponseData(sendMsg, req.body.phone));
};

exports.contact = async (req: Request, res: Response) => {
  const Msg = new CreateMessage(clientSession[req.body.cid]);
  const sendMsg = await Msg.contact(req.body.contacts[0]).send(req.body.phone);
  return res
    .status(200)
    .json(createFormatResponseData(sendMsg, req.body.phone));
};

/**
 * Create Formating Response from return res Whatsapp
 */
const createFormatResponseData = (
  resSend: any,
  phone: string,
  addData?: object
) => {
  const format = {
    status: true,
    message: "OK",
    data: {
      sent: resSend.status == 2,
      status: resSend.status ?? 0,
      message: resSend.status == 2 ? "message sent" : "fail sending message",
      id: resSend.key.id,
      to: phone,
      timestamp: resSend.messageTimestamp,
    },
  };

  return format;
};
