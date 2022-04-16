import Client from "./Client";
import CreateMessage from "./CreateMessage";
// import { ClientLegacy as Client } from "./ClientLegacy";
// import fs from "fs";
// import { stderr, stdout } from "process";

async function start() {
  const c = new Client("david-stat", false);

  // const sock = await c.createSock("david-111");
  const sock = await c.startSock();
  setTimeout(() => {
    const pesan = new CreateMessage("6281358209109");
    const formatpesan = pesan.reaction("BAE58A7938CEF0E6", "👍").print();
    sock.sendMessage("6281358209109@s.whatsapp.net", formatpesan);
  }, 1000 * 10);
}
console.log("Running...");

start();
