// Hubs/StreamingHub.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace gstream.Hubs
{
    [Authorize] // Secure the hub with JWT
    public class StreamingHub : Hub
    {
        // A dictionary to keep track of users in rooms.
        // Key: roomId, Value: List of connection IDs in that room.
        private static readonly Dictionary<string, List<string>> Rooms = new Dictionary<string, List<string>>();

        // Method for a user to join a specific streaming room.
        public async Task JoinRoom(string roomId)
        {
            if (!Rooms.ContainsKey(roomId))
            {
                Rooms[roomId] = new List<string>();
            }

            // Only allow two users per room for a 1-on-1 call
            if (Rooms[roomId].Count >= 2)
            {
                await Clients.Caller.SendAsync("RoomFull");
                return;
            }

            Rooms[roomId].Add(Context.ConnectionId);
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

            // Notify the other user in the room that a new user has joined.
            await Clients.GroupExcept(roomId, Context.ConnectionId).SendAsync("UserJoined", Context.ConnectionId);
        }

        // Method for a user to leave a room.
        public async Task LeaveRoom(string roomId)
        {
            if (Rooms.ContainsKey(roomId))
            {
                Rooms[roomId].Remove(Context.ConnectionId);
                if (Rooms[roomId].Count == 0)
                {
                    Rooms.Remove(roomId);
                }
            }
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
            await Clients.Group(roomId).SendAsync("UserLeft", Context.ConnectionId);
        }

        // Relays the WebRTC offer from the caller to the other user in the room.
        public async Task SendOffer(string roomId, object offer)
        {
            await Clients.GroupExcept(roomId, Context.ConnectionId).SendAsync("ReceiveOffer", offer);
        }

        // Relays the WebRTC answer from the callee back to the original caller.
        public async Task SendAnswer(string roomId, object answer)
        {
            await Clients.GroupExcept(roomId, Context.ConnectionId).SendAsync("ReceiveAnswer", answer);
        }

        // Relays ICE candidates between the peers to help establish a connection.
        public async Task SendIceCandidate(string roomId, object candidate)
        {
            await Clients.GroupExcept(roomId, Context.ConnectionId).SendAsync("ReceiveIceCandidate", candidate);
        }

        public override async Task OnDisconnectedAsync(Exception exception)
        {
            // Find which room the user was in and notify others.
            foreach (var room in Rooms)
            {
                if (room.Value.Contains(Context.ConnectionId))
                {
                    await LeaveRoom(room.Key);
                    break;
                }
            }
            await base.OnDisconnectedAsync(exception);
        }
    }
}
