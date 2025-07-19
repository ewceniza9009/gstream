using gstream.Hubs;
using gstream.Models;
using gstream.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;     

namespace gstream.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(AuthenticationSchemes = "ApiKey")]
    public class BroadcastController : ControllerBase
    {
        private readonly TokenService _tokenService;
        private readonly IConfiguration _configuration;    

        public BroadcastController(TokenService tokenService, IConfiguration configuration)
        {
            _tokenService = tokenService;
            _configuration = configuration;    
        }

        [HttpGet("join/{roomId}")]
        public IActionResult JoinBroadcast(string roomId)
        {
            if (!BroadcastHub.DoesBroadcastExist(roomId))
            {
                return NotFound(new { message = "No active broadcast found for the specified room ID." });
            }

            var tempUser = new UserModel { Username = $"consumer-{Guid.NewGuid()}" };
            var temporaryToken = _tokenService.GenerateToken(tempUser);

            var serverUrl = "https://b2twb5ss-44304.asse.devtunnels.ms";
            if (string.IsNullOrEmpty(serverUrl))
            {
                serverUrl = $"{Request.Scheme}://{Request.Host}";
            }
            var response = new
            {
                roomId = roomId,
                signalRHubUrl = $"{serverUrl}/broadcasthub",
                token = temporaryToken,
                message = "Broadcast found. Use the provided token to connect to the SignalR hub."
            };

            return Ok(response);
        }
    }
}
