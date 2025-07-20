using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using gstream.Services;

namespace gstream.Hubs
{
    [Authorize]
    public class BroadcastHub : Hub
    {
        private readonly IBroadcastStateService _stateService;

        public BroadcastHub(IBroadcastStateService stateService)
        {
            _stateService = stateService;
        }

        public async Task StartBroadcast(string roomId, string broadcastType)
        {
            if (await _stateService.IsBroadcastActiveAsync(roomId))
            {
                await Clients.Caller.SendAsync("BroadcastExists");
                return;
            }
            if (broadcastType == "mesh")
            {
                await _stateService.StartBroadcastAsync(roomId, Context.ConnectionId, broadcastType);
                await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
                await Clients.Caller.SendAsync("BroadcastStarted");
            }
        }

        public async Task SendChatMessage(string roomId, string message)
        {
            if (string.IsNullOrEmpty(roomId) || string.IsNullOrEmpty(message)) return;

            var username = Context.User.Identity?.Name ?? $"User-{Context.ConnectionId.Substring(0, 5)}";
            await Clients.Group(roomId).SendAsync("ReceiveChatMessage", username, message);
        }

        public async Task ViewBroadcast(string roomId)
        {
            var broadcasterId = await _stateService.GetBroadcasterConnectionIdAsync(roomId);
            if (string.IsNullOrEmpty(broadcasterId))
            {
                await Clients.Caller.SendAsync("NoBroadcastFound");
                return;
            }
            await _stateService.AddViewerToBroadcastAsync(roomId, Context.ConnectionId);
            await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
            await Clients.Client(broadcasterId).SendAsync("NewViewer", Context.ConnectionId);
        }

        public async Task SendOfferToViewer(string viewerId, object offer)
        {
            await Clients.Client(viewerId).SendAsync("ReceiveOfferFromBroadcaster", offer, Context.ConnectionId);
        }

        public async Task SendAnswerToBroadcaster(string broadcasterId, object answer)
        {
            await Clients.Client(broadcasterId).SendAsync("ReceiveAnswerFromViewer", answer, Context.ConnectionId);
        }

        public async Task SendIceCandidate(string targetConnectionId, object candidate)
        {
            await Clients.Client(targetConnectionId).SendAsync("ReceiveIceCandidate", candidate);
        }

        public override async Task OnDisconnectedAsync(System.Exception? exception)
        {
            var (roomId, isBroadcaster) = await _stateService.GetConnectionInfoAsync(Context.ConnectionId);

            if (!string.IsNullOrEmpty(roomId))
            {
                if (isBroadcaster)
                {
                    await _stateService.EndBroadcastAsync(roomId, Context.ConnectionId);
                    await Clients.Group(roomId).SendAsync("BroadcastEnded");
                }
                else
                {
                    await _stateService.RemoveViewerFromBroadcastAsync(roomId, Context.ConnectionId);
                    var broadcasterId = await _stateService.GetBroadcasterConnectionIdAsync(roomId);
                    if (!string.IsNullOrEmpty(broadcasterId))
                    {
                        await Clients.Client(broadcasterId).SendAsync("ViewerLeft", Context.ConnectionId);
                    }
                }
            }

            await base.OnDisconnectedAsync(exception);
        }
    }
}