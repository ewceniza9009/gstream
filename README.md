# gstream

**gstream** is a real-time video streaming application built with **ASP.NET Core**, **SignalR**, and **WebRTC**. It supports **one-to-one video streaming** and **one-to-many broadcasting**, using **Redis** for state management and **JWT/API key authentication**.

---

## ✨ Features

- 🚀 Scalable Broadcasting via LiveKit SFU, allowing a single broadcaster to stream to a large audience with minimal client-side load.
- 💬 Live Chat for real-time interaction during broadcasts.
- 📡 Dual Broadcasting Modes: Choose between a simple peer-to-peer mesh for small groups or a powerful SFU for large audiences.
- 🔗 One-to-one video streaming via WebRTC and SignalR.
- 🔐 JWT-based user authentication for broadcasters.
- 💅 Responsive UI with Tailwind CSS.
- ⚡ Real-time communication with SignalR and Redis.
- 🌐 Cross-platform support with .NET 9.0.

---

## 📁 Project Structure

<pre>
* `gstream`
    * ├── `Authentication` - Handles custom authentication logic.
        * └── `ApiKeyAuth.cs` - Implements API key-based authentication for consumers.
    * ├── `Controllers` - Manages incoming HTTP requests and API endpoints.
        * ├── `AdminController.cs` - API endpoints for the admin dashboard (user/room management).
        * ├── `AuthController.cs` - Handles user login, registration, and password changes.
        * ├── `BroadcastController.cs` - Manages starting, joining, and recording broadcasts.
        * ├── `RoomController.cs` - API for creating, reading, updating, and deleting rooms.
        * └── `UserController.cs` - API for user-specific actions like managing API keys.
    * ├── `Hubs` - Contains SignalR hubs for real-time communication.
        * ├── `BroadcastHub.cs` - Manages WebSocket connections for multi-viewer broadcasts (Mesh/SFU).
        * └── `StreamingHub.cs` - Manages WebSocket connections for one-on-one video calls.
    * ├── `Migrations` - Contains Entity Framework code for database schema changes.
    * ├── `Models` - Defines the data structures and objects for the application.
        * ├── `Data` - Entity Framework models that map to database tables.
            * ├── `ApplicationDbContext.cs` - The main database context for Entity Framework.
            * ├── `ChatMessage.cs` - Defines the `ChatMessage` table structure.
            * ├── `Room.cs` - Defines the `Room` table structure.
            * └── `User.cs` - Defines the `User` table structure.
        * ├── `Mongo` - Defines models for MongoDB (if used).
        * ├── `ChangePasswordRequest.cs` - Data model for the change password API endpoint.
        * ├── `ChatMessageDto.cs` - Data Transfer Object for sending chat messages to the client.
        * ├── `LoginRequest.cs` - Data model for the login/registration API endpoints.
        * ├── `RoomDtp.cs` - Data Transfer Object for sending room data to the client.
        * ├── `RoomRequest.cs` - Data model for room creation/update API endpoints.
        * └── `UserModel.cs` - Data model for user information, used in the admin panel.
    * ├── `Properties` - Contains project configuration files.
        * └── `launchSettings.json` - Defines profiles for running the application locally.
    * ├── `Services` - Contains business logic and interacts with the database.
        * ├── `IBroadcastStateService.cs` - Interface for managing the state of live broadcasts.
        * ├── `IRoomService.cs` - Interface for room management logic.
        * ├── `IUserService.cs` - Interface for user management logic.
        * ├── `LiveKitService.cs` - Handles interactions with the LiveKit SFU server.
        * ├── `RedisBroadcastStateService.cs` - Implements broadcast state management using Redis.
        * ├── `RoomService.cs` - Implements the room management logic.
        * └── `UserService.cs` - Implements the user management logic.
    * ├── `wwwroot` - Contains all static files served to the client (HTML, JS, CSS).
        * ├── `js` - Contains all JavaScript files.
            * ├── `account.js` - Logic for the "My Account" page.
            * ├── `admin.js` - Logic for the Admin Dashboard.
            * ├── `broadcast.js` - Logic for the Broadcaster Dashboard.
            * ├── `consumer.js` - Logic for the broadcast viewing page.
            * └── `streaming.js` - Logic for the one-on-one streaming page.
        * ├── `account.html` - The "My Account" page for users.
        * ├── `admin.html` - The Admin Dashboard page.
        * ├── `broadcast.html` - The broadcaster's main page for logging in and starting streams.
        * ├── `consumer.html` - The page for viewing a broadcast.
        * ├── `index.html` - The main landing page of the application.
        * └── `streaming.html` - The page for one-on-one video calls.
    * ├── `gstream.csproj` - The main C# project file, defines dependencies and settings.
    * ├── `gstream.http` - File for testing API endpoints directly within Visual Studio.
    * ├── `gstream.sln` - The Visual Studio solution file.
    * └── `Program.cs` - The main entry point of the ASP.NET Core application, where services are configured.
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
<img width="1912" height="894" alt="image" src="https://github.com/user-attachments/assets/d1b72235-79c8-49c7-a175-b744c2f63a23" />
<img width="1919" height="902" alt="image" src="https://github.com/user-attachments/assets/2f0c6d60-91fc-4594-b14f-a77dd2342afb" />
<img width="1919" height="907" alt="image" src="https://github.com/user-attachments/assets/699280c5-e6d0-4f72-af4c-f157e6020720" />

## Broadcasting
<img width="1919" height="905" alt="Screenshot 2025-07-20 010138" src="https://github.com/user-attachments/assets/864f6823-f5aa-4dc5-a5b1-f8d291969c65" />

## Broadcast Consumer
<img width="1919" height="911" alt="Screenshot 2025-07-19 220100" src="https://github.com/user-attachments/assets/d648a0f6-39a7-47ae-a7f6-ee74ac272c6d" />

---

## Features

- One-to-One Streaming: Uses a direct WebRTC peer-to-peer connection, with signaling brokered by SignalR.
- One-to-Many Broadcasting (Mesh Mode): The broadcaster creates a direct WebRTC connection with every individual viewer. This is simple but limited by the broadcaster's upload bandwidth. Best for 1-2 viewers.
- One-to-Many Broadcasting (SFU Mode): The broadcaster sends a single high-quality stream to the LiveKit SFU. The SFU then handles the heavy lifting of distributing that stream to all viewers. This method is highly efficient and scalable, allowing for a large audience.

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

## 🧪 How to Restream (Consumer Developer)

### 🎥 Backend

```csharp
// In the developer's own ASP.NET Core project
[ApiController]
[Route("api/stream-proxy")]
public class StreamProxyController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private const string GStreamApiUrl = "https://YOUR_GSTREAM_URL.com"; // Your service URL
    private const string MySecretApiKey = "gsk_...the_developers_secret_api_key"; // Their key to YOUR service
    private const string MyUsernameForGstream = "proxy-user"; // The display name they use

    public StreamProxyController(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    [HttpGet("join/{roomName}")]
    public async Task<IActionResult> JoinStream(string roomName)
    {
        var client = _httpClientFactory.CreateClient();
        
        // Step 1: Prepare the request to the original gstream service
        var request = new HttpRequestMessage(HttpMethod.Post, $"{GStreamApiUrl}/api/broadcast/join/{roomName}");
        request.Headers.Add("X-Api-Key", MySecretApiKey);

        var joinRequestBody = new { username = MyUsernameForGstream };
        request.Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(joinRequestBody), System.Text.Encoding.UTF8, "application/json");

        // Step 2: Call your gstream service to get a temporary connection token
        var response = await client.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            return StatusCode((int)response.StatusCode, "Could not connect to the stream.");
        }

        // Step 3: Forward the successful response (containing the token) to your own user
        var responseBody = await response.Content.ReadAsStringAsync();
        return Content(responseBody, "application/json");
    }
}
````
### 📢 HTML/Javascript UI

```html
<!DOCTYPE html>
<html>
<head>
    <title>Our Awesome Stream</title>
</head>
<body>
    <h1>Live Stream</h1>
    <video id="remoteVideo" autoplay playsinline style="width:100%"></video>

    <script src="https://cdn.jsdelivr.net/npm/livekit-client@2.2.0/dist/livekit-client.umd.min.js"></script>
    <script>
        const remoteVideo = document.getElementById('remoteVideo');
        const roomName = 'Public Room 1'; // The room they want to restream

        async function connectToStream() {
            try {
                // Call OWN backend proxy,
                const response = await fetch(`/api/stream-proxy/join/${roomName}`);
                const connectionDetails = await response.json();

                // Use token received proxy to connect the LiveKit
                const livekitRoom = new LivekitClient.Room();
                await livekitRoom.connect(connectionDetails.liveKitUrl, connectionDetails.token);

                livekitRoom.on(LivekitClient.RoomEvent.TrackSubscribed, (track) => {
                    if (track.kind === 'video') {
                        const element = track.attach();
                        remoteVideo.srcObject = element.srcObject;
                    }
                });

            } catch (error) {
                console.error("Failed to connect to stream via proxy.", error);
            }
        }

        connectToStream();
    </script>
</body>
</html>
```
---
## How to use IP Camera

To stream from an IP camera, you need to provide the camera's specific video stream URL, not just its IP address. This URL acts as a direct link to the camera's video feed.
The most common formats for this are RTSP and MJPEG.

How a User Finds and Uses the Stream URL
Find the Camera's IP Address: The user first needs to find the camera's local IP address on their network (e.g., 192.168.1.100). This is usually found by looking at the connected devices list in their Wi-Fi router's settings.
Find the Stream Path: Every camera brand and model has a unique URL path for its video stream. The best way to find this is to search online for "[Camera Brand] [Camera Model] RTSP URL". For example, "Amcrest IP2M-841 RTSP URL".
Combine and Authenticate: The final URL is a combination of the IP address, the stream path, and often a username and password for the camera itself.

Example
Let's say a user has:
Camera IP Address: 192.168.1.123
Camera Username: admin
Camera Password: cam_password

After searching online, they find their camera's RTSP path is /cam/realmonitor?channel=1&subtype=0.

The final URL they would enter into the "IP Camera" input field in your application would be:
rtsp://admin:cam_password@192.168.1.123/cam/realmonitor?channel=1&subtype=0

Pro Tip: Users can test this URL in a media player like VLC (File -> Open Network Stream) to confirm it works before putting it into your application.

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
  - Livekit(For SFU)
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
