import fs from "fs";
import jwt from "jsonwebtoken";
import { ExtendedError, Socket } from "socket.io";

export function middleware(
  socket: Socket,
  next: (err?: ExtendedError) => void,
) {
  const token = socket.handshake.auth.token ?? socket.handshake.headers.token;
  if (!token) {
    return next(new Error("Authentication error: Token required"));
  }
  try {
    const user = verifyUser(token);
    if (!user) {
      return next(new Error("Authentication error: Invalid token"));
    }
    socket.data.user = user;
    next();
  } catch (err) {
    return next(new Error("Authentication error: Invalid token"));
  }
}

export function writeStorage(data: any) {
  try {
    fs.writeFileSync("storage.json", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing storage.json:", error);
  }
}

export function readStorage() {
  try {
    const data = fs.readFileSync("storage.json", "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading storage.json:", error);
    return {};
  }
}

export function sendDataToBackend() {
  const storageData = readStorage();

  const currentTime = new Date();
  console.log("Sending data to backend:", storageData);
}

export function verifyUser(token: string) {
  try {
    return jwt.verify(
      token,
      "9fb43ca5501c1c875715be9b2b40699c71a75a8754a814fa0985002905f08a5d",
    );
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

export function calculateNewAverage(existingData: any, newValues: any) {
  const newCount = existingData.count + 1;
  const factor = existingData.count / newCount;

  return {
    sensorData: {
      temperature:
        existingData.sensorData.temperature * factor +
        newValues.temperature / newCount,
      spo2: existingData.sensorData.spo2 * factor + newValues.spo2 / newCount,
      heartrate:
        existingData.sensorData.heartrate * factor +
        newValues.heartrate / newCount,
    },
    count: newCount,
  };
}
