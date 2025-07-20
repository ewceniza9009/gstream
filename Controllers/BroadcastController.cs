using gstream.Models;
using gstream.Services;
using Livekit.Server.Sdk.Dotnet;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using System.Security.Claims;    

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

        public class JoinRequest
        {
            public string Username { get; set; }
        }

        [HttpPost("join/{roomId}")]
        [Authorize(AuthenticationSchemes = "ApiKey")]         
        public async Task<IActionResult> JoinBroadcast(string roomId, [FromBody] JoinRequest request)
        {
            if (string.IsNullOrEmpty(request?.Username))
            {
                return BadRequest(new { message = "Username is required." });
            }

            var authenticatedUsername = User.Identity?.Name;

            if (authenticatedUsername != request.Username)
            {
                return Unauthorized(new { message = "Provided username does not match authenticated API Key user." });
            }

            if (!await _stateService.IsBroadcastActiveAsync(roomId))
            {
                return NotFound(new { message = "No active broadcast found for the specified room ID." });
            }

            var broadcastType = await _stateService.GetBroadcastTypeAsync(roomId);
            var consumerIdentity = request.Username;             

            if (broadcastType == "sfu")
            {
                var liveKitToken = _liveKitService.GenerateToken(roomId, consumerIdentity, isBroadcaster: false);
                return Ok(new
                {
                    broadcastType = "sfu",
                    roomId,
                    liveKitUrl = _liveKitService.GetLiveKitUrl(),
                    token = liveKitToken,
                    username = consumerIdentity,
                    message = "SFU broadcast found. Use the LiveKit token to connect."
                });
            }
            else
            {
                var tempUser = new UserModel { Username = consumerIdentity };
                var temporaryToken = _tokenService.GenerateToken(tempUser);
                return Ok(new
                {
                    broadcastType = "mesh",
                    roomId,
                    signalRHubUrl = "/broadcasthub",
                    token = temporaryToken,
                    username = consumerIdentity,
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

        [HttpPost("record/start/{roomId}")]
        [Authorize]       
        public async Task<IActionResult> StartRecording(string roomId)
        {
            if (!await _stateService.IsBroadcastActiveAsync(roomId))
            {
                return NotFound(new { message = "No active broadcast to record." });
            }

            var filePath = $"/mnt/recordings/{roomId}-{DateTime.UtcNow:yyyyMMddHHmmss}.mp4";

            try
            {
                var egressClient = _liveKitService.CreateEgressClient();
                var egressInfo = await egressClient.StartRoomCompositeEgress(new RoomCompositeEgressRequest
                {
                    RoomName = roomId,
                    File = new EncodedFileOutput
                    {
                        FileType = EncodedFileType.Mp4,
                        Filepath = filePath
                    }
                });

                return Ok(new { message = "Recording started successfully.", egressId = egressInfo.EgressId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Failed to start recording: {ex.Message}" });
            }
        }
    }
}