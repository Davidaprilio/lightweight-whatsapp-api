import { Client } from "./Client";
// import { ClientLegacy as Client } from "./ClientLegacy";
// import fs from "fs";
// import { stderr, stdout } from "process";

async function start() {
  const c = new Client("david-111");

  // const sock = await c.createSock("david-111");
  const sock = await c.startSock();
  // setTimeout(() => {
  //   sock.loggedOut();
  // }, 1000 * 20);
}
console.log("Running...");

start();
