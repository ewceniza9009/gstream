using gstream.Models;
using gstream.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;
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
        private readonly IRoomService _roomService;

        public AdminController(IUserService userService, IBroadcastStateService stateService, LiveKitService liveKitService, ILogger<AdminController> logger, IRoomService roomService)
        {
            _userService = userService;
            _stateService = stateService;
            _liveKitService = liveKitService;
            _logger = logger;
            _roomService = roomService;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetSystemStats()
        {
            var activeStreamsFromRedis = await _stateService.GetAllActiveStreamsAsync();
            var accurateStreamStats = new Dictionary<string, long>();

            foreach (var stream in activeStreamsFromRedis)
            {
                var roomName = stream.Key;
                var broadcastType = await _stateService.GetBroadcastTypeAsync(roomName);

                if (broadcastType == "sfu")
                {
                    var participantCount = await _liveKitService.GetParticipantCountAsync(roomName);
                    accurateStreamStats[roomName] = participantCount > 0 ? participantCount - 1 : 0;
                }
                else      
                {
                    accurateStreamStats[roomName] = stream.Value;
                }
            }

            var totalViewers = accurateStreamStats.Sum(s => s.Value);

            var popularRooms = accurateStreamStats
                .OrderByDescending(s => s.Value)
                .Take(5)
                .Select(s => new { RoomName = s.Key, Viewers = s.Value });

            return Ok(new
            {
                TotalActiveStreams = accurateStreamStats.Count,
                TotalViewers = totalViewers,
                PopularRooms = popularRooms
            });
        }

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

        [HttpPost("broadcasts/flush")]
        public async Task<IActionResult> FlushBroadcasts()
        {
            await _stateService.FlushAllBroadcastsAsync();
            return Ok(new { message = "All active broadcasts have been successfully flushed." });
        }

        [HttpPost("broadcasts/end/{roomName}")]
        public async Task<IActionResult> EndBroadcast(string roomName)
        {
            if (!await _stateService.IsBroadcastActiveAsync(roomName))
            {
                return NotFound(new { message = "No active broadcast found in this room." });
            }

            _logger.LogInformation("Admin is force-ending broadcast in room: {RoomName}", roomName);

            var broadcastType = await _stateService.GetBroadcastTypeAsync(roomName);
            if (broadcastType == "sfu")
            {
                await _liveKitService.DeleteRoomAsync(roomName);
            }

            var broadcasterIdentity = await _stateService.GetBroadcasterConnectionIdAsync(roomName);
            if (!string.IsNullOrEmpty(broadcasterIdentity))
            {
                await _stateService.EndBroadcastAsync(roomName, broadcasterIdentity);
            }

            _logger.LogInformation("Cleanup successful for room '{RoomName}'.", roomName);
            return Ok(new { message = $"Successfully ended broadcast in room: {roomName}" });
        }
    }
}