import express from "express";
import { connect as mqttConnect } from "mqtt";
import { createServer } from "http";
import { Server } from "socket.io";
import {
  calculateNewAverage,
  middleware,
  readStorage,
  writeStorage,
} from "./helper";

const PORT = 3000;
const TOPIC = "gamingstein/vitallink";
const BROKER_URL = "tcp://broker.emqx.io:1883";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["*"],
    credentials: true,
  },
});
const client = mqttConnect(BROKER_URL);

io.use(middleware);

client.on("connect", () => {
  console.log(`Connected to MQTT broker at ${BROKER_URL}`);
  client.subscribe(TOPIC, (err) => {
    if (err) {
      console.error(`Failed to subscribe to topic ${TOPIC}:`, err);
    } else {
      console.log(`Subscribed to topic: ${TOPIC}`);
    }
  });
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("subscribe", (sensorId: string) => {
    socket.join(`room:${sensorId}`);
    console.log(`Client ${socket.id} joined room:${sensorId}`);
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

client.on("message", (topic, message) => {
  if (topic !== TOPIC) return;

  const { timestamp, sensorData, sensorID } = JSON.parse(message.toString());
  const storageData = readStorage();

  // Parse sensor values once
  const parsedValues = {
    temperature: parseFloat(sensorData.temperature).toFixed(2),
    spo2: parseFloat(sensorData.spo2).toFixed(2),
    heartrate: parseFloat(sensorData.heartrate).toFixed(2),
  };

  // Update or create sensor data
  const existingData = storageData[sensorID];
  storageData[sensorID] = existingData
    ? calculateNewAverage(existingData, parsedValues)
    : { sensorData: parsedValues, count: 1 };

  writeStorage(storageData);

  // Emit to subscribed sockets
  if (storageData[sensorID].count % 2 === 0) {
    const sensorPayload = { topic, timestamp, sensorData, sensorID };
    io.to(`room:${sensorID}`).emit("sensor-data", sensorPayload);
  }
});

client.on("error", (error) => {
  console.error("MQTT connection error:", error);
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
