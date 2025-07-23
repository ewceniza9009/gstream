using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace gstream.Hubs
{
    [Authorize]      
    public class StreamingHub : Hub
    {
        private static readonly Dictionary<string, List<string>> Rooms = new Dictionary<string, List<string>>();

        public async Task JoinRoom(string roomId)
        {
            if (!Rooms.ContainsKey(roomId))
            {
                Rooms[roomId] = new List<string>();
            }

            if (Rooms[roomId].Count >= 2)
            {
                await Clients.Caller.SendAsync("RoomFull");
                return;
            }

            Rooms[roomId].Add(Context.ConnectionId);
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

            await Clients.GroupExcept(roomId, Context.ConnectionId).SendAsync("UserJoined", Context.ConnectionId);
        }

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

        public async Task SendOffer(string roomId, object offer)
        {
            await Clients.GroupExcept(roomId, Context.ConnectionId).SendAsync("ReceiveOffer", offer);
        }

        public async Task SendAnswer(string roomId, object answer)
        {
            await Clients.GroupExcept(roomId, Context.ConnectionId).SendAsync("ReceiveAnswer", answer);
        }

        public async Task SendIceCandidate(string roomId, object candidate)
        {
            await Clients.GroupExcept(roomId, Context.ConnectionId).SendAsync("ReceiveIceCandidate", candidate);
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
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
