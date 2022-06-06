import clientSession from "../Main/SessionClient";
import { Request, Response } from "express";
import CreateMessage from "../Main/CreateMessage";
import QueueMessage, { queueStatus } from "../models/QueueMessage";

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

exports.list = async (req: Request, res: Response) => {
  const Msg = new CreateMessage(clientSession[req.body.cid]);
  const sendMsg = await Msg.list(req.body.data).send(req.body.phone);
  return res
    .status(200)
    .json(createFormatResponseData(sendMsg, req.body.phone));
};

exports.image = async (req: Request, res: Response) => {
  const Msg = new CreateMessage(clientSession[req.body.cid]);
  const sendMsg = await Msg.image(req.body.url, req.body.caption).send(
    req.body.phone
  );
  return res
    .status(200)
    .json(createFormatResponseData(sendMsg, req.body.phone));
};

exports.video = async (req: Request, res: Response) => {
  const Msg = new CreateMessage(clientSession[req.body.cid]);
  if (req.body.gif ?? false) {
    Msg.gif(req.body.url, req.body.caption);
  } else {
    Msg.video(req.body.url, req.body.caption);
  }
  const sendMsg = await Msg.send(req.body.phone);
  return res
    .status(200)
    .json(createFormatResponseData(sendMsg, req.body.phone));
};

exports.audio = async (req: Request, res: Response) => {
  const Msg = new CreateMessage(clientSession[req.body.cid]);
  const sendMsg = await Msg.audio(req.body.url).send(req.body.phone);
  return res
    .status(200)
    .json(createFormatResponseData(sendMsg, req.body.phone));
};

exports.location = async (req: Request, res: Response) => {
  const Msg = new CreateMessage(clientSession[req.body.cid]);
  const sendMsg = await Msg.location(req.body.lat, req.body.long).send(
    req.body.phone
  );
  return res
    .status(200)
    .json(createFormatResponseData(sendMsg, req.body.phone));
};

exports.buttonTemplate = async (req: Request, res: Response) => {
  const body = req.body;
  const Msg = new CreateMessage(clientSession[body.cid]);
  Msg.text(body.text, body.footer ?? null);

  const data = {
    link: Object.keys(body).indexOf("link"),
    call: Object.keys(body).indexOf("call"),
    button: Object.keys(body).indexOf("button"),
  };
  const dataReady = Object.entries(data).sort(([, a], [, b]) => a - b);
  let missingData = 0;
  dataReady.forEach(([name, val]) => {
    if (val !== -1) {
      if (name === "link") {
        Msg.template("url", body[name].text, body[name].url);
      } else if (name === "call") {
        Msg.template("phone", body[name].text, body[name].number);
      } else if (name === "button") {
        Msg.template(
          "button",
          body[name].text,
          body[name].id ?? "template-btn-1"
        );
      }
    } else {
      missingData++;
    }
  });
  if (missingData == 3) {
    return res.status(402).json({
      status: true,
      message: "Bad Request",
      errors:
        "missing property. there must be at least one url, link, or button",
    });
  }
  console.log(req.body.phone, Msg.print());

  const sendMsg = await Msg.send(req.body.phone);
  return res
    .status(200)
    .json(createFormatResponseData(sendMsg, req.body.phone));
};

exports.sendManyMessage = async (req: Request, res: Response) => {
  const queId = randString(8);
  const arrData = req.body.data.map((v: any) => ({
    ...v,
    cid: req.body.cid,
    type: v?.button ? "button" : "text",
    queId,
  }));
  const create = await QueueMessage.create(arrData);
  let msg = "";
  if (clientSession[req.body.cid] === undefined) {
    msg = "not running";
  } else {
    runQueue(req.body.cid, queId);
    msg = "running";
  }
  return res.status(200).json({
    status: true,
    message: "OK",
    data: {
      message: msg,
      length: Object.keys(create).length,
      queId,
    },
  });
};

exports.startQueue = async (req: Request, res: Response) => {
  const queId = randString(8);
  const arrData = req.body.data.map((v: any) => ({
    ...v,
    cid: req.body.cid,
    type: v?.button ? "button" : "text",
    queId,
  }));
  const create = await QueueMessage.create(arrData);
  let msg = "";
  if (clientSession[req.body.cid] === undefined) {
    msg = "not running";
  } else {
    runQueue(req.body.cid, queId);
    msg = "running";
  }
  return res.status(200).json({
    status: true,
    message: "OK",
    data: {
      message: msg,
      length: Object.keys(create).length,
      queId,
    },
  });
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
      sent: typeof resSend?.key?.id === "string",
      status: resSend.status ?? 0,
      message: resSend?.key?.id ? "message sent" : "fail sending message",
      id: resSend?.key?.id,
      to: phone,
      timestamp: resSend?.messageTimestamp,
    },
  };

  return format;
};

function randString(length: number) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

async function runQueue(cid: string, queId: string) {
  if (clientSession[cid] === undefined) {
    // Kirim event queue selesai
    clientSession[cid].ev.emit("queue.end", queId);
  } else {
    // Ambil data
    const msg = await QueueMessage.findOne({
      responseStatus: 0,
      queId,
    });

    if (msg) {
      const res = await sendQueueMessage(msg, clientSession[cid]);
      try {
        await QueueMessage.updateOne(
          { _id: msg._id },
          {
            responseStatus: res.code,
            responseMessage: res.msg,
          }
        );
      } catch (error) {
        console.error(error);
      }
      await runQueue(cid, queId);
    }
    // Kirim event queue selesai
    else {
      clientSession[cid].ev.emit("queue.end", queId);
    }
  }
}
/**
 * Hanya bisa kirim pesan dengan type text|button|gambar|video
 */
async function sendQueueMessage(msg: any, sock: any) {
  await new Promise((r) => setTimeout(r, msg.delay * 1000));

  // Buat Pesan
  const Msg = new CreateMessage(sock);
  if (msg.type == "button") {
    // karena button require text, maka jika tidak return error format invalid
    if (msg.text == undefined) return queueStatus.formatInvalid;
    Msg.button(msg.button, msg.footer ?? null);
  }
  // jika ada media tambahkan media-nya
  if (msg.media == "image") {
  } else if (msg.media == "vidio") {
  }
  Msg.text(msg.text);

  // Send Message
  const resWa = await Msg.send(msg.phone);

  if (resWa.status === false && resWa.error === true) {
    return queueStatus.formatInvalid;
  } else if (resWa.status === false && resWa.isRegister === false) {
    return queueStatus.notRegistered;
  }

  return {
    code: resWa.status == 2 ? queueStatus.sent.code : queueStatus.failed.code,
    msg: resWa.status == 2 ? queueStatus.sent.msg : queueStatus.failed.msg,
    data: {
      queId: msg.queId,
      sent: resWa.status == 2,
      status: resWa.status ?? 0,
      message: resWa.status == 2 ? "message sent" : "fail sending message",
      id: resWa?.key?.id,
      to: msg.phone,
      timestamp: resWa?.messageTimestamp,
    },
  };
}
