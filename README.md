# gstream

**gstream** is a real-time video streaming application built with **ASP.NET Core**, **SignalR**, and **WebRTC**. It supports **one-to-one video streaming** and **one-to-many broadcasting**, using **Redis** for state management and **JWT/API key authentication**.

---

## ✨ Features

- 🔗 One-to-one video streaming via WebRTC and SignalR
- 📡 One-to-many broadcasting with API key authentication for viewers
- 🔐 JWT-based user authentication
- 💅 Responsive UI with Tailwind CSS
- ⚡ Real-time communication with SignalR and Redis
- 🌐 Cross-platform support with .NET 9.0

---

## 📁 Project Structure

<pre>
gstream
├── Authentication
│   └── ApiKeyAuth.cs             # API key authentication handler
├── Controllers
│   ├── AuthController.cs         # User authentication (login)
│   └── BroadcastController.cs    # Broadcast joining for consumers
├── Hubs
│   ├── BroadcastHub.cs           # SignalR hub for broadcasting
│   └── StreamingHub.cs           # SignalR hub for one-to-one streaming
├── Models
│   └── UserModel.cs              # User model for authentication
├── Properties
│   └── launchSettings.json       # Development settings
├── Services
│   ├── IBroadcastStateService.cs # Broadcast state interface
│   └── RedisBroadcastService.cs  # Redis-based state service
├── wwwroot
│   ├── js
│   │   ├── broadcast.js          # Broadcasting client logic
│   │   ├── consumer.js           # Broadcast consumer logic
│   │   └── main.js               # One-to-one streaming logic
│   ├── broadcast.html            # Broadcasting UI
│   ├── consumer.html             # Broadcast consumer UI
│   └── index.html                # One-to-one streaming UI
├── .gitattributes
├── .gitignore
├── appsettings.Development.json
├── appsettings.json
├── gstream.csproj
├── gstream.http
├── gstream.sln
├── Program.cs
└── TokenService.cs               # JWT token service
</pre>

---

## ⚙️ Prerequisites

- [.NET 9.0 SDK](https://dotnet.microsoft.com/download)
- Redis (local or via connection string)
- Web browser with WebRTC support (e.g., Chrome, Firefox, Edge)

---

## 🚀 Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd gstream
   ```

2. **Configure Redis**

   Edit `appsettings.json`:

   ```json
   "ConnectionStrings": {
     "Redis": "localhost:6379"
   }
   ```

3. **Configure JWT**

   ```json
   "Jwt": {
     "Issuer": "gstream-api",
     "Audience": "gstream-clients",
     "Key": "<your-secure-key>"
   }
   ```

4. **Configure API Key**

   ```json
   "ApiKey": "<your-api-key>"
   ```

5. **Configure Public URL**

   ```json
   "PublicUrl": "http://localhost:5122"
   ```

6. **Restore dependencies**

   ```bash
   dotnet restore
   ```

7. **Run the application**

   ```bash
   dotnet run
   ```

---

## 🌐 Access the Application

- **One-to-one streaming:**  
  `http://localhost:[Port#]`

- **Broadcasting:**  
  `http://localhost:[Port#]/broadcast.html`

- **Broadcast consumer:**  
  `http://localhost:[Port#]/consumer.html`

- **Test credentials:**  
  `Username: testuser`  
  `Password: password`

---

---
## Access Page
<img width="1918" height="909" alt="Screenshot 2025-07-19 215856" src="https://github.com/user-attachments/assets/d64c784c-9aac-4d5e-9960-395c12f0b99c" />
<img width="1916" height="894" alt="Screenshot 2025-07-19 215912" src="https://github.com/user-attachments/assets/81315b38-01ba-4fc5-93db-cb27f2ea0c8f" />
<img width="1909" height="1033" alt="Screenshot 2025-07-19 223844" src="https://github.com/user-attachments/assets/df29ac0c-0304-4632-adc8-1a93fb612d2d" />

## Broadcasting
<img width="1917" height="896" alt="Screenshot 2025-07-19 215942" src="https://github.com/user-attachments/assets/075683f4-03e6-4bb1-879a-86ac24d54f32" />

## Broadcast Consumer
<img width="1919" height="911" alt="Screenshot 2025-07-19 220100" src="https://github.com/user-attachments/assets/d648a0f6-39a7-47ae-a7f6-ee74ac272c6d" />

---

## 🧪 Usage

### 🎥 One-to-One Streaming

1. Go to `index.html`  
2. Log in with `testuser / password`  
3. Enter a Room ID  
4. Click **Join Room**

### 📢 Broadcasting

1. Go to `broadcast.html`  
2. Log in with `testuser / password`  
3. Click **Start Broadcast**  
4. Enter a Room ID and begin streaming

### 👀 Broadcast Consumer

1. Go to `consumer.html`  
2. Enter your **API Key** and **Room ID**  
3. Click **Find and View Stream**

---

## 🔐 Authentication

- **Users:** JWT-based via `AuthController`  
- **Consumers:** API key-based via `ApiKeyAuth`

---

## 📡 WebRTC and SignalR

- **WebRTC:** Peer-to-peer media streaming using STUN servers  
- **SignalR:** Real-time signaling with Redis backplane

---

## 🔧 Configuration Reference

### `appsettings.json`

```json
{
  "PublicUrl": "http://localhost:5122",
  "ConnectionStrings": {
    "Redis": "localhost:6379"
  },
  "Jwt": {
    "Issuer": "gstream-api",
    "Audience": "gstream-clients",
    "Key": "<your-secure-key>"
  },
  "ApiKey": "<your-api-key>"
}
```

---

## 🛠 Development

- **Swagger UI:** Available at `/swagger` (in development mode)
- **HTTP Testing:** Use `gstream.http` with REST Client
- **Tech Stack:**  
  - ASP.NET Core 9.0  
  - SignalR  
  - Redis  
  - WebRTC  
  - Tailwind CSS  
  - Swashbuckle

---

## ⚠️ Notes

- Ensure camera/microphone permissions are granted in your browser.
- Local video preview is mirrored.
- Broadcasts expire after **4 hours**.
- Only **one broadcaster per room** is allowed.

---

## 📄 License

**Distributed By: Erwin Wilson Ceniza**
