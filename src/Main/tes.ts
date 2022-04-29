import Client from "./Client";
import CreateMessage from "./CreateMessage";

async function start() {
  const c = new Client("david14-test", false);
  const sock = await c.startSock();

  setTimeout(async () => {
    const muc = "https://www.w3schools.com/html/horse.mp3";
    const vid = "https://www.w3schools.com/html/mov_bbb.mp4";
    const img = "https://www.w3schools.com/html/pic_trulli.jpg";
    const pesan = new CreateMessage(c);

    pesan.reaction("BAE5D5F19363F333");
    // pesan.img(img);
    // pesan.video(vid);
    // pesan.gif(vid);

    // pesan.print();
    console.log(await pesan.send("085231028718", true));
  }, 1000 * 5);
}
console.log("Running...");

start();
// 'BAE5D5F19363F333'
