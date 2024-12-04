const mongoose = require('mongoose');
const express = require('express');
const mqtt = require('mqtt');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const jwt = require('jsonwebtoken');


const SECRET_KEY = '####';
const BROKER_URL = 'tcp://localhost:1883';
const TOPIC = 'gamingstein/sensordata';
const PORT = 8080;
const DB_URI = 'mongodb+srv://kunwarsingh:kunwarsingh@cluster0.kyuta.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';


const sensorDataSchema = new mongoose.Schema(
    {
        timestamp: {
            type: Date,
            required: true,
        },
        sensorData: {
            temperature: { type: Number, default: 0 },
            spo2: { type: Number, default: 0 },
            heartrate: { type: Number, default: 0 },
        },
        sensorID: {
            type: String,
            required: true,
        },
    },
    {
        timeseries: {
            timeField: 'timestamp',
            metaField: 'sensorID',
            granularity: 'hours',
        },
        expireAfterSeconds: 36000,
    }
);

const SensorData = mongoose.model('SensorData', sensorDataSchema);


mongoose
    .connect(DB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));


function readStorage() {
    try {
        const data = fs.readFileSync('storage.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading storage.json:', error);
        return {};
    }
}

function writeStorage(data) {
    fs.writeFileSync('storage.json', JSON.stringify(data, null, 2));
}


function storeDataToMongoDB() {
    const storageData = readStorage();

    const currentTime = new Date();

    const sensorEntries = Object.entries(storageData).map(([sensorID, { sensorData }]) => ({
        timestamp: currentTime,
        sensorData,
        sensorID,
    }));

    SensorData.insertMany(sensorEntries)
    .then(() => {
        console.log('Stored aggregated data to MongoDB:', sensorEntries);
        writeStorage({});
        console.log('Cleared storage.json after data transfer.');
    })
    .catch((err) => {
        console.error('Error storing data to MongoDB:', err);
    });
}


setInterval(storeDataToMongoDB,60 * 1000);


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: true,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});
const client = mqtt.connect(BROKER_URL);

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error: Token required'));
    }
    try {
        const user = jwt.verify(token, SECRET_KEY);
        socket.user = user;
        next();
    } catch (err) {
        return next(new Error('Authentication error: Invalid token'));
    }
});

const socketSensorMap = new Map();

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    socket.on('registerSensor', (sensorId) => {
        console.log(`Client ${socket.id} registered for sensorId: ${sensorId}`);
        socketSensorMap.set(socket.id, sensorId);
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        socketSensorMap.delete(socket.id);
    });
});

client.on('connect', () => {
    console.log(`Connected to MQTT broker at ${BROKER_URL}`);
    client.subscribe(TOPIC, (err) => {
        if (err) {
            console.error(`Failed to subscribe to topic ${TOPIC}:`, err);
        } else {
            console.log(`Subscribed to topic: ${TOPIC}`);
        }
    });
});

client.on('message', (topic, message) => {
    if (topic === TOPIC) {
        const data = JSON.parse(message.toString());
        console.log(data);
        const { timestamp, sensorData, sensorID } = data;
        const storageData = readStorage();

        if (storageData[sensorID]) {
            const { temperature: prevT, heartrate: prevH, spo2: prevS } = storageData[sensorID].sensorData;
            const prevC = storageData[sensorID].count;
            const newData = {
                temperature: (prevT * prevC + parseFloat(sensorData.temperature)) / (prevC + 1),
                spo2: (prevS * prevC + parseFloat(sensorData.spo2)) / (prevC + 1),
                heartrate: (prevH * prevC + parseFloat(sensorData.heartrate)) / (prevC + 1),
            };
            storageData[sensorID] = { sensorData: newData, count: prevC + 1 };
        } else {
            storageData[sensorID] = { sensorData, count: 1 };
        }

        writeStorage(storageData);
        io.emit('temperatureData', { topic, timestamp, sensorData, sensorID });

        socketSensorMap.forEach((registeredSensorId, socketId) => {
            if (registeredSensorId === sensorID) {
                io.to(socketId).emit('temperatureData', { topic, timestamp, sensorData, sensorID });
            }
        });
    }
});

client.on('error', (error) => {
    console.error('MQTT connection error:', error);
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
