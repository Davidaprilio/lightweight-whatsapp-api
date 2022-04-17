import Client from "../Main/Client";
import { Request, Response } from "express";
import Device from "../models/Device";
import CreateMessage from "../Main/CreateMessage";
import clientSession from "../Main/SessionClient";
import { check } from "express-validator";
import { validate } from "../Main/Validator";

exports.start = (req: Request, res: Response) => {
  validate([check("multidevice").not().isEmpty()]);
  if (clientSession[req.body.cid] !== undefined) {
    return res.status(400).json({
      status: false,
      message: "Bad Request",
      errors: "Device already connected",
    });
  }
  handleStart(req.body.cid, req.body.multidevice ?? false);

  res.json({
    status: true,
    message: "Started",
  });
};

exports.logout = (req: Request, res: Response) => {
  console.log("client logout", req.body.idName);
  clientSession["david"].logout();
  return res.json({
    status: true,
  });
};

exports.getSession = (req: Request, res: Response) => {
  return res.json({
    clientSession,
  });
};

exports.create = async (req: Request, res: Response) => {
  Device.create({
    label: req.body.label,
    cid: req.body.cid,
  })
    .then((resp) => {
      res.json({
        resp,
      });
    })
    .catch((err) => {
      res.status(500).json({
        err,
      });
    });
};

export const handleStart = async (cid: string, mode: boolean) => {
  clientSession[cid] = new Client(cid, mode);
  await clientSession[cid].startSock();
  handleEvent(clientSession[cid]);
  return;
};

function handleEvent(client: Client) {
  client.ev.on(
    "device.changeMode",
    async (modeText: string, multiDevice: boolean) => {
      await Device.findOneAndUpdate(
        { cid: client.sockClient.id },
        { mode: multiDevice }
      );
      console.log("ganti Mode dengan handle event: ", modeText);
    }
  );

  client.ev.on(
    "device.connected",
    async (clientId: string, clientInfo: object) => {
      await Device.findOneAndUpdate(
        { cid: client.sockClient.id },
        {
          auth: true,
          // lastConnected:
        }
      );
      console.log("Event: Device Connect", client.sockClient.id);
    }
  );
}
