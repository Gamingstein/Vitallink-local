# VitalLink Local

**VitalLink Local** is a TypeScript-powered service that acts as a bridge between IoT medical devices and the centralized VitalLink system. It captures, preprocesses, and transmits patient vital signs data, ensuring real-time monitoring and analysis.

## 🚀 Features

- **Real-Time Data Acquisition**: Interfaces with various medical IoT devices to collect vital signs.
- **Data Preprocessing**: Cleanses and formats raw data for consistency and accuracy.
- **Offline Support**: Stores data locally during network outages and syncs when connectivity is restored.
- **Seamless Integration**: Communicates with the [VitalLink GraphQL API](https://github.com/Gamingstein/Vitallink-graphql) for centralized data management.

## 🏗️ Architecture

\[IoT Devices] → \[VitalLink Local] → \[GraphQL API] → \[Frontend & Mobile Apps]

- **IoT Devices**: Medical hardware capturing patient data.
- **VitalLink Local**: This service, handling data collection and preprocessing.
- **GraphQL API**: Centralized API managing data flow to applications.
- **Frontend & Mobile Apps**: Interfaces for healthcare professionals to monitor and analyze data.

## 📦 Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/Gamingstein/Vitallink-local.git
   cd Vitallink-local
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Configure Environment Variables**

   Create a `.env` file in the root directory and define necessary variables:

   ```env
   DEVICE_PORT=/dev/ttyUSB0
   API_ENDPOINT=https://api.vitallink.com
   ```

4. **Run the Service**

   ```bash
   npm start
   ```

## 🧪 Testing

Run tests using:

```bash
npm test
```

## 📁 Project Structure

```
Vitallink-local/
├── src/
│   ├── devices/        # Device integration modules
│   ├── services/       # Core service logic
│   ├── utils/          # Utility functions
│   └── index.ts        # Entry point
├── .env                # Environment variables
├── package.json
└── tsconfig.json
```

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## 📄 License

This project is licensed under the MIT License.
