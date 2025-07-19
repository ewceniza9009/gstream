using gstream.Models;
using gstream.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace gstream.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BroadcastController : ControllerBase
    {
        private readonly TokenService _tokenService;
        private readonly IBroadcastStateService _stateService;

        public BroadcastController(TokenService tokenService, IBroadcastStateService stateService)
        {
            _tokenService = tokenService;
            _stateService = stateService;
        }

        [HttpGet("join/{roomId}")]
        [Authorize(AuthenticationSchemes = "ApiKey")]
        public async Task<IActionResult> JoinBroadcast(string roomId)
        {
            if (!await _stateService.IsBroadcastActiveAsync(roomId))
            {
                return NotFound(new { message = "No active broadcast found for the specified room ID." });
            }

            var tempUser = new UserModel { Username = $"consumer-{Guid.NewGuid()}" };
            var temporaryToken = _tokenService.GenerateToken(tempUser);

            var response = new
            {
                roomId = roomId,
                signalRHubUrl = "/broadcasthub",
                token = temporaryToken,
                message = "Broadcast found. Use the provided token to connect to the SignalR hub."
            };

            return Ok(response);
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
