using gstream.Models;
using gstream.Services;
using Livekit.Server.Sdk.Dotnet;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;      
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
        private readonly ILogger<BroadcastController> _logger;

        public BroadcastController
        (
            ILogger<BroadcastController> logger,
            TokenService tokenService, 
            IBroadcastStateService stateService, 
            LiveKitService liveKitService
        )
        {
            _logger = logger;
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
                return Ok(new { broadcastType = "sfu", roomId, liveKitUrl = _liveKitService.GetLiveKitUrl(), token = liveKitToken, username = consumerIdentity, message = "SFU broadcast found. Use the LiveKit token to connect." });
            }
            else
            {
                var tempUser = new UserModel { Username = consumerIdentity };
                var temporaryToken = _tokenService.GenerateToken(tempUser);
                return Ok(new { broadcastType = "mesh", roomId, signalRHubUrl = "/broadcasthub", token = temporaryToken, username = consumerIdentity, message = "Mesh broadcast found. Use the provided JWT to connect to the SignalR hub." });
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
            var broadcasterIdentity = User.Identity?.Name;
            if (string.IsNullOrEmpty(broadcasterIdentity))
            {
                _logger.LogError("Could not start broadcast for room {RoomId} because user name claim is missing from token.", roomId);
                return Unauthorized(new { message = "Valid token but missing name claim." });
            }

            _logger.LogInformation("Starting SFU broadcast for room '{RoomId}' by user '{User}'.", roomId, broadcasterIdentity);
            await _stateService.StartBroadcastAsync(roomId, broadcasterIdentity, "sfu");
            var liveKitToken = _liveKitService.GenerateToken(roomId, broadcasterIdentity, isBroadcaster: true);
            return Ok(new { liveKitUrl = _liveKitService.GetLiveKitUrl(), token = liveKitToken, username = broadcasterIdentity });
        }

        [HttpPost("end/sfu/{roomId}")]
        [Authorize]
        public async Task<IActionResult> EndSfuBroadcast(string roomId)
        {
            var callerIdentity = User.Identity?.Name;
            _logger.LogInformation("Attempting to end SFU broadcast for room '{RoomId}'. Caller identity from token: '{Caller}'", roomId, callerIdentity);

            if (string.IsNullOrEmpty(callerIdentity))
            {
                return Unauthorized(new { message = "User identity not found in token." });
            }

            var storedBroadcaster = await _stateService.GetBroadcasterConnectionIdAsync(roomId);
            if (storedBroadcaster == null)
            {
                _logger.LogInformation("Cleanup for room '{RoomId}' skipped: Broadcast not found or already ended.", roomId);
                return Ok(new { message = "Broadcast not found or already ended." });
            }

            if (storedBroadcaster != callerIdentity)
            {
                _logger.LogWarning("FORBIDDEN: User '{Caller}' cannot end broadcast for room '{RoomId}'. Owner is '{Owner}'.", callerIdentity, roomId, storedBroadcaster);
                return new ObjectResult(new
                {
                    message = "Ownership check failed. You are not authorized to end this broadcast.",
                    yourIdentity = callerIdentity,
                    ownerIdentity = storedBroadcaster
                })
                { StatusCode = 403 };
            }

            _logger.LogInformation("Ownership confirmed for room '{RoomId}'. Proceeding with cleanup.", roomId);
            await _liveKitService.DeleteRoomAsync(roomId);
            await _stateService.EndBroadcastAsync(roomId, callerIdentity);
            _logger.LogInformation("Cleanup successful for room '{RoomId}'.", roomId);

            return Ok(new { message = "Broadcast ended successfully." });
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
                var egressInfo = await egressClient.StartRoomCompositeEgress(new RoomCompositeEgressRequest { RoomName = roomId, File = new EncodedFileOutput { FileType = EncodedFileType.Mp4, Filepath = filePath } });
                return Ok(new { message = "Recording started successfully.", egressId = egressInfo.EgressId });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Failed to start recording: {ex.Message}" });
            }
        }
    }
}