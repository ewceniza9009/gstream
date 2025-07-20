Of course. Here is the updated `README.md` file, modified to include the new SFU scaling capability powered by LiveKit, the live chat feature, and updated setup instructions.

-----

# gstream

**gstream** is a real-time video streaming application built with **ASP.NET Core**, **SignalR**, and **WebRTC**. It supports **one-to-one video streaming** and **scalable one-to-many broadcasting** using a **Selective Forwarding Unit (SFU)** powered by **LiveKit**. It uses **Redis** for state management and **JWT/API key authentication**.

-----

## ✨ Features

  - 🚀 **Scalable Broadcasting** via LiveKit SFU, allowing a single broadcaster to stream to a large audience with minimal client-side load.
  - 💬 **Live Chat** for real-time interaction during broadcasts.
  - 📡 **Dual Broadcasting Modes:** Choose between a simple peer-to-peer mesh for small groups or a powerful SFU for large audiences.
  - 🔗 One-to-one video streaming via WebRTC and SignalR.
  - 🔐 JWT-based user authentication for broadcasters.
  - 💅 Responsive UI with Tailwind CSS.
  - ⚡ Real-time communication with SignalR and Redis.
  - 🌐 Cross-platform support with .NET 9.0.

-----

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

-----

## ⚙️ Prerequisites

  - [.NET 9.0 SDK](https://dotnet.microsoft.com/download)
  - **Docker** (for running LiveKit and Redis)
  - A running Redis instance
  - A running LiveKit instance
  - Web browser with WebRTC support (e.g., Chrome, Firefox, Edge)

-----

## 🚀 Setup

1.  **Clone the Repository**

    ```bash
    git clone <repository-url>
    cd gstream
    ```

2.  **Configure and Run LiveKit Server**

      - Create a file named `livekit.yaml` in the project's root directory.
      - Add the following configuration. Replace the key and secret with your own secure, random values (the secret must be at least 32 characters long).
        ```yaml
        port: 7880
        rtc:
          tcp_port: 7881
          port_range_start: 50000
          port_range_end: 60000
        keys:
          APIKeyForGStream: ThisIsMyNewVerySecureSecretKeyForLiveKit32
        ```
      - Run the LiveKit server in a terminal using Docker:
        ```bash
        docker run --rm -it -p 7880:7880 -p 7881:7881 -p 50000-60000:50000-60000/udp -v ./livekit.yaml:/app/livekit.yaml livekit/livekit-server --config /app/livekit.yaml
        ```

3.  **Run Redis Server**

      - In a **new terminal**, run Redis using Docker:
        ```bash
        docker run --rm -it -p 6379:6379 redis
        ```

4.  **Configure the `gstream` Application**

      - Edit `appsettings.json` and fill in the values for `Jwt`, `ApiKey`, and the `LiveKit` section, making sure the keys match what you set in `livekit.yaml`.
        ```json
        {
          "ConnectionStrings": {
            "Redis": "localhost:6379"
          },
          "Jwt": {
            "Issuer": "gstream-api",
            "Audience": "gstream-clients",
            "Key": "<your-secure-jwt-key>"
          },
          "LiveKit": {
            "Url": "ws://localhost:7880",
            "ApiKey": "APIKeyForGStream",
            "ApiSecret": "ThisIsMyNewVerySecureSecretKeyForLiveKit32"
          },
          "ApiKey": "<your-secure-api-key-for-consumers>"
        }
        ```

5.  **Restore Dependencies and Run**

    ```bash
    dotnet restore
    dotnet run
    ```

-----

## архитектура

  - **One-to-One Streaming:** Uses a direct WebRTC peer-to-peer connection, with signaling brokered by SignalR.
  - **One-to-Many Broadcasting (Mesh Mode):** The broadcaster creates a direct WebRTC connection with every individual viewer. This is simple but limited by the broadcaster's upload bandwidth. Best for 1-2 viewers.
  - **One-to-Many Broadcasting (SFU Mode):** The broadcaster sends a single high-quality stream to the **LiveKit SFU**. The SFU then handles the heavy lifting of distributing that stream to all viewers. This method is highly efficient and scalable, allowing for a large audience.

-----

## 🧪 Usage

### 🎥 One-to-One Streaming

1.  Go to `index.html`
2.  Log in with `testuser / password`
3.  Enter a Room ID and click **Join Room**

### 📢 Broadcasting

1.  Go to `broadcast.html`
2.  Log in with `testuser / password`
3.  Choose a broadcast type: **SFU (Recommended)** or Mesh.
4.  Enter a Room ID and click **Start Broadcast**.

### 👀 Broadcast Consumer

1.  Go to `consumer.html`
2.  Enter your **API Key** and **Room ID**
3.  Click **Find and View Stream**

-----

## 🔧 Configuration Reference

### `appsettings.json`

```json
{
  "ConnectionStrings": {
    "Redis": "localhost:6379"
  },
  "Jwt": {
    "Issuer": "gstream-api",
    "Audience": "gstream-clients",
    "Key": "<your-secure-jwt-key>"
  },
  "LiveKit": {
    "Url": "ws://localhost:7880",
    "ApiKey": "<your-livekit-api-key>",
    "ApiSecret": "<your-livekit-api-secret>"
  },
  "ApiKey": "<your-secure-api-key>"
}
```

### `livekit.yaml`

```yaml
port: 7880
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 60000
keys:
  # Must match the ApiKey and ApiSecret in appsettings.json
  <your-livekit-api-key>: <your-livekit-api-secret-at-least-32-chars>
```

-----

## ⚠️ Notes

  - Ensure camera/microphone permissions are granted in your browser.
  - Ensure your firewall allows access to the required TCP and UDP ports if testing on a local network.
  - Broadcasts expire after **4 hours** in Redis.
  - Only **one broadcaster per room** is allowed.

-----

## 📄 License

**Distributed By: Erwin Wilson Ceniza**