using gstream.Models;
using gstream.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace gstream.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(AuthenticationSchemes = "ApiKey")]
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
        public async Task<IActionResult> JoinBroadcast(string roomId)
        {
            if (!await _stateService.IsBroadcastActiveAsync(roomId))
            {
                return NotFound(new { message = "No active broadcast found for the specified room ID." });
            }

            var tempUser = new UserModel { Username = $"consumer-{Guid.NewGuid()}" };
            var temporaryToken = _tokenService.GenerateToken(tempUser);

            // The hub URL is now relative, as the base URL is known by the client
            var response = new
            {
                roomId = roomId,
                signalRHubUrl = "/broadcasthub", // Relative path is more robust
                token = temporaryToken,
                message = "Broadcast found. Use the provided token to connect to the SignalR hub."
            };

            return Ok(response);
        }
    }
}