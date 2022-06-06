import clientSession from "./SessionClient";
import Gevent from "./GlobalEvent";
import Device from "../models/Device";
const deviceController = require("../controllers/deviceController");
const socketIO = require("socket.io");

module.exports = function (httpServer) {
  const io = socketIO(httpServer, {
    origins: "*:*",
    method: ["GET", "POST"],
  });

  // Start Listening
  io.on("connection", (socket) => {
    // Auth
    io.use((socket, next) => {
      const cid = socket.handshake.auth.cid;
      console.log("Socket", cid);
      if (!cid) {
        next(new Error("Authentication Error"));
      }
      socket.cid = cid;
      console.log("Socket Connected", cid);
      next();
    });

    socket.on("device-start", async (mode) => {
      console.log("Start", socket.cid);
      const client = clientSession[socket.cid];
      if (client === undefined) {
        try {
          var device = await Device.findOne({ cid: socket.cid });
        } catch (err) {
          console.log("Device start error", err);
        }
        if (device) {
          deviceController.handleStart(
            socket.cid,
            device.mode === "MultiDevice"
          );
        } else {
          console.log("start Device not found");
          socket.emit("device.start.failed", "Device not found");
        }
      } else if (client.info.status != "connected") {
        console.log("Start Client", socket.cid);
        client.startSock(true);
      } else {
        console.log("Device already connected");
        socket.emit("device.start.failed", "Device already connected");
      }
    });

    socket.on("device-stop", () => {
      if (clientSession[socket.cid] !== undefined) {
        clientSession[socket.cid].stopSock();
      }
    });

    socket.on("device-logout", async () => {
      if (clientSession[socket.cid] !== undefined) {
        await clientSession[socket.cid].logout();
        delete clientSession[socket.cid];
      }
    });

    // Handle Disconnect
    socket.on("disconnect", () => {
      console.log(`Socket ${socket.id} out from ${socket.cid}`);
      socket.leave(socket.cid);
      socket.leave(socket.id);
    });

    // Handle Join to Device Room
    socket.on("listen-device", (cid) => {
      socket.join(`device:${cid}`);
      socket.emit("listened.device");
    });

    socket.on("device-info", () => {
      console.log("info device:", socket.cid);
      const client = clientSession[socket.cid];
      if (client) {
        socket.emit("device.info", client.info);
      } else {
        socket.emit("device.info", {
          status: "disconnected",
          message: "Device Not Activated",
        });
      }
    });

    socket.on("room", () => {
      // List all rooms
      console.log(io.sockets.adapter.rooms);
    });

    Gevent.on("device.connection.update", (cid, data) => {
      socket.emit("device.connection.update", data);
      //   // .to(`device:${cid}`)
    });

    /**
     * QRcode Event
     */
    Gevent.on("device.qrcode.update", (cid, data) => {
      socket.to(`device:${cid}`).emit("qrcode.update", data);
    });
    Gevent.on("device.qrcode.stop", (cid, data) => {
      socket.to(`device:${cid}`).emit("qrcode.stop", data);
    });
  });
};
