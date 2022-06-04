import clientSession from "./SessionClient";
import Gevent from "./GlobalEvent";
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

    socket.on("device-start", (mode) => {
      console.log("Start", socket.cid);
      if (clientSession[socket.cid] === undefined) {
        deviceController.handleStart(socket.cid, mode);
      }
    });
    socket.on("device-stop", () => {
      console.log("Start", socket.cid);
      if (clientSession[socket.cid] === undefined) {
        clientSession[socket.cid].logout();
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
      socket.to(`device:david14-test`).emit("listened.device");
    });

    socket.on("device-info", () => {
      console.log("info device:", socket.cid);
      const client = clientSession[socket.cid]?.info;
      if (client) {
        console.log("info device send:", client.id);
        socket.emit("device.connected", client, true);
      }
    });

    socket.on("room", () => {
      // List all rooms
      console.log(io.sockets.adapter.rooms);
    });

    Gevent.on("device.connected", (cid, user, mode) => {
      socket.to(`device:${cid}`).emit("device.connected", user, mode);
    });
    Gevent.on("device.connecting", (cid, user) => {
      socket.to(`device:${cid}`).emit("device.connected");
    });
    Gevent.on("device.disconnected", (cid) => {
      socket.to(`device:${cid}`).emit("device.connected");
    });

    /**
     * QRcode Event
     */
    Gevent.on("qrcode.update", (cid, data) => {
      socket.to(`device:${cid}`).emit("qrcode.update", data);
    });

    Gevent.on("qrcode.stop", (cid, data) => {
      socket.to(`device:${cid}`).emit("qrcode.stop", data);
    });
  });
};
