using gstream.Models;
using gstream.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace gstream.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BroadcastController : ControllerBase
    {
        private readonly TokenService _tokenService;
        private readonly IBroadcastStateService _stateService;
        private readonly LiveKitService _liveKitService;

        public BroadcastController(TokenService tokenService, IBroadcastStateService stateService, LiveKitService liveKitService)
        {
            _tokenService = tokenService;
            _stateService = stateService;
            _liveKitService = liveKitService;
        }

        [HttpGet("join/{roomId}")]
        [Authorize(AuthenticationSchemes = "ApiKey")]
        public async Task<IActionResult> JoinBroadcast(string roomId)
        {
            if (!await _stateService.IsBroadcastActiveAsync(roomId))
            {
                return NotFound(new { message = "No active broadcast found for the specified room ID." });
            }

            var broadcastType = await _stateService.GetBroadcastTypeAsync(roomId);

            if (broadcastType == "sfu")
            {
                var consumerIdentity = $"consumer-{Guid.NewGuid()}";
                var liveKitToken = _liveKitService.GenerateToken(roomId, consumerIdentity, isBroadcaster: false);
                return Ok(new
                {
                    broadcastType = "sfu",
                    roomId,
                    liveKitUrl = _liveKitService.GetLiveKitUrl(),
                    token = liveKitToken,
                    message = "SFU broadcast found. Use the LiveKit token to connect."
                });
            }
            else           
            {
                var tempUser = new UserModel { Username = $"consumer-{Guid.NewGuid()}" };
                var temporaryToken = _tokenService.GenerateToken(tempUser);
                return Ok(new
                {
                    broadcastType = "mesh",
                    roomId,
                    signalRHubUrl = "/broadcasthub",
                    token = temporaryToken,
                    message = "Mesh broadcast found. Use the provided JWT to connect to the SignalR hub."
                });
            }
        }

        [HttpPost("start/sfu/{roomId}")]
        [Authorize]      
        public async Task<IActionResult> StartSfuBroadcast(string roomId)
        {
            if (await _stateService.IsBroadcastActiveAsync(roomId))
            {
                return Conflict(new { message = "A broadcast is already active in this room." });
            }

            var broadcasterIdentity = User.Identity?.Name ?? $"broadcaster-{Guid.NewGuid()}";

            await _stateService.StartBroadcastAsync(roomId, broadcasterIdentity, "sfu");

            var liveKitToken = _liveKitService.GenerateToken(roomId, broadcasterIdentity, isBroadcaster: true);

            return Ok(new
            {
                liveKitUrl = _liveKitService.GetLiveKitUrl(),
                token = liveKitToken,
                username = broadcasterIdentity
            });
        }


        [HttpPost("flush")]
        [Authorize(AuthenticationSchemes = "ApiKey")]
        public async Task<IActionResult> FlushBroadcasts()
        {
            await _stateService.FlushAllBroadcastsAsync();
            return Ok(new { message = "All active broadcasts have been successfully flushed." });
        }
    }
}