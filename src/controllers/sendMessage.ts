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
  return res.status(200).json({
    status: true,
    data: {
      sent: sendMsg.status == 2,
      status: sendMsg.status ?? 0,
      message: sendMsg.status == 2 ? "message sent" : "fail sending message",
      id: sendMsg.key.id,
      to: req.body.phone,
      timestamp: sendMsg.messageTimestamp,
    },
  });
};

exports.button = async (req: Request, res: Response) => {
  const Msg = new CreateMessage(clientSession[req.body.cid]);
  const sendMsg = await Msg.text(req.body.text)
    .button(req.body.buttons, req.body.footer)
    .send(req.body.phone);
  return res.status(200).json({
    status: true,
    data: {
      sent: sendMsg.status == 2,
      status: sendMsg.status ?? 0,
      message: sendMsg.status == 2 ? "message sent" : "fail sending message",
      id: sendMsg.key.id,
      to: req.body.phone,
      timestamp: sendMsg.messageTimestamp,
    },
  });
};
