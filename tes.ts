// import { Client } from "./src/Main/Client";

// const client1 = new Client("David-test");
// client1.startSock();

// setTimeout(() => {
//   client1.logout();
// }, 60000);

// get weather data in nganjuk today with fetch
async function getWeather() {
  const url = "https://api.openweathermap.org/data/2.5/weather";
  const params = {
    q: "Nganjuk, ID",
    units: "metric",
    appid: "d8f9f8f8d8f9f8f9f9f9f9f9f9f9f9f9",
  };
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  const data = await response.json();
  return data;
}

console.log(getWeather());
