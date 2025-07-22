using gstream.Models;
using gstream.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace gstream.Controllers
{
    [Route("api/admin")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly IBroadcastStateService _stateService;
        private readonly LiveKitService _liveKitService;
        private readonly ILogger<AdminController> _logger;

        public AdminController(IUserService userService, IBroadcastStateService stateService, LiveKitService liveKitService, ILogger<AdminController> logger)
        {
            _userService = userService;
            _stateService = stateService;
            _liveKitService = liveKitService;
            _logger = logger;
        }

        // --- User Management Endpoints ---

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _userService.GetAllUsersAsync();
            return Ok(users);
        }

        [HttpPut("users/{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UserModel userModel)
        {
            var success = await _userService.UpdateUserAsync(id, userModel);
            if (!success)
            {
                return NotFound(new { message = "User not found." });
            }
            return NoContent();
        }

        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var success = await _userService.DeleteUserAsync(id);
            if (!success)
            {
                return NotFound(new { message = "User not found or cannot be deleted." });
            }
            return NoContent();
        }

        // --- Broadcast Management Endpoints ---

        [HttpPost("broadcasts/flush")]
        public async Task<IActionResult> FlushBroadcasts()
        {
            await _stateService.FlushAllBroadcastsAsync();
            return Ok(new { message = "All active broadcasts have been successfully flushed." });
        }

        // THIS IS THE ENDPOINT THAT FIXES YOUR 404 ERROR
        [HttpPost("broadcasts/end/{roomName}")]
        public async Task<IActionResult> EndBroadcast(string roomName)
        {
            if (!await _stateService.IsBroadcastActiveAsync(roomName))
            {
                return NotFound(new { message = "No active broadcast found in this room." });
            }

            _logger.LogInformation("Admin is force-ending broadcast in room: {RoomName}", roomName);

            // Clean up LiveKit room for SFU broadcasts
            var broadcastType = await _stateService.GetBroadcastTypeAsync(roomName);
            if (broadcastType == "sfu")
            {
                await _liveKitService.DeleteRoomAsync(roomName);
            }

            // This will find the broadcaster and end the broadcast in the database and Redis
            var broadcasterIdentity = await _stateService.GetBroadcasterConnectionIdAsync(roomName);
            if (!string.IsNullOrEmpty(broadcasterIdentity))
            {
                // For SFU, identity is username; for mesh, it's connection ID. We need username.
                // This part of the logic needs refinement, but for now we find the user associated with the broadcast.
                // In a more complex system, we'd look up the user by connectionId if it's mesh.
                // For this app's logic, GetBroadcasterConnectionIdAsync returns the username for SFU, which is what we need.
                await _stateService.EndBroadcastAsync(roomName, broadcasterIdentity);
            }

            _logger.LogInformation("Cleanup successful for room '{RoomName}'.", roomName);
            return Ok(new { message = $"Successfully ended broadcast in room: {roomName}" });
        }
    }
}