// Hubs/BroadcastHub.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Threading.Tasks;

namespace gstream.Hubs
{
    [Authorize]
    public class BroadcastHub : Hub
    {
        // Using ConcurrentDictionary for thread safety
        // Key: roomId, Value: Connection ID of the broadcaster
        // Made this public so the API controller can access it.
        public static readonly ConcurrentDictionary<string, string> Broadcasters = new();

        // Key: roomId, Value: List of viewer connection IDs
        private static readonly ConcurrentDictionary<string, List<string>> Viewers = new();

        // *** NEW METHOD TO BE ADDED ***
        /// <summary>
        /// Allows other parts of the application (like an API controller) to check if a broadcast is active.
        /// </summary>
        public static bool DoesBroadcastExist(string roomId)
        {
            return Broadcasters.ContainsKey(roomId);
        }
        // *****************************

        /// <summary>
        /// Called by a client to start broadcasting in a room.
        /// </summary>
        public async Task StartBroadcast(string roomId)
        {
            if (Broadcasters.ContainsKey(roomId))
            {
                // A broadcaster already exists for this room.
                await Clients.Caller.SendAsync("BroadcastExists");
                return;
            }

            // This user is the new broadcaster for the room.
            Broadcasters[roomId] = Context.ConnectionId;
            Viewers.TryAdd(roomId, new List<string>()); // Ensure the viewer list is created
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
            await Clients.Caller.SendAsync("BroadcastStarted");
        }

        /// <summary>
        /// Called by a client who wants to view a broadcast.
        /// </summary>
        public async Task ViewBroadcast(string roomId)
        {
            if (!Broadcasters.TryGetValue(roomId, out var broadcasterId))
            {
                // No one is broadcasting in this room.
                await Clients.Caller.SendAsync("NoBroadcastFound");
                return;
            }

            // Add the new viewer to the room's list
            if (Viewers.TryGetValue(roomId, out var viewerList))
            {
                viewerList.Add(Context.ConnectionId);
            }
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

            // Notify the new viewer that they can start the connection process.
            // The broadcaster will initiate the offer.
            await Clients.Client(broadcasterId).SendAsync("NewViewer", Context.ConnectionId);
        }

        // The broadcaster sends a WebRTC offer to a specific new viewer.
        public async Task SendOfferToViewer(string viewerId, object offer)
        {
            await Clients.Client(viewerId).SendAsync("ReceiveOfferFromBroadcaster", offer, Context.ConnectionId);
        }

        // A viewer sends a WebRTC answer back to the broadcaster.
        public async Task SendAnswerToBroadcaster(string broadcasterId, object answer)
        {
            await Clients.Client(broadcasterId).SendAsync("ReceiveAnswerFromViewer", answer, Context.ConnectionId);
        }

        // Generic method to relay ICE candidates between peers.
        public async Task SendIceCandidate(string targetConnectionId, object candidate)
        {
            await Clients.Client(targetConnectionId).SendAsync("ReceiveIceCandidate", candidate);
        }

        public override async Task OnDisconnectedAsync(System.Exception? exception)
        {
            // Check if the disconnected user was a broadcaster
            var room = Broadcasters.FirstOrDefault(b => b.Value == Context.ConnectionId);
            if (!string.IsNullOrEmpty(room.Key))
            {
                var roomId = room.Key;
                // Notify all viewers in that room that the broadcast has ended
                await Clients.Group(roomId).SendAsync("BroadcastEnded");

                // Clean up server state
                Broadcasters.TryRemove(roomId, out _);
                Viewers.TryRemove(roomId, out _);
            }
            // Check if the disconnected user was a viewer
            else
            {
                foreach (var roomId in Viewers.Keys)
                {
                    if (Viewers.TryGetValue(roomId, out var viewerList) && viewerList.Contains(Context.ConnectionId))
                    {
                        viewerList.Remove(Context.ConnectionId);
                        if (Broadcasters.TryGetValue(roomId, out var broadcasterId))
                        {
                            // Notify the broadcaster that a viewer has left
                            await Clients.Client(broadcasterId).SendAsync("ViewerLeft", Context.ConnectionId);
                        }
                        break;
                    }
                }
            }

            await base.OnDisconnectedAsync(exception);
        }
    }
}
