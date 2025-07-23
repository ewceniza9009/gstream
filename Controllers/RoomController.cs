using gstream.Models;
using gstream.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace gstream.Controllers
{
    [Route("api/rooms")]
    [ApiController]
    [Authorize]      
    public class RoomController : ControllerBase
    {
        private readonly IRoomService _roomService;
        private readonly ILogger<RoomController> _logger;

        public RoomController(IRoomService roomService, ILogger<RoomController> logger)
        {
            _roomService = roomService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetRooms()
        {
            var rooms = await _roomService.GetAllRoomsAsync();
            return Ok(rooms);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateRoom([FromBody] RoomRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var newRoom = await _roomService.CreateRoomAsync(request.Name);
            if (newRoom == null)
            {
                return Conflict(new { message = "A room with this name already exists." });
            }
            return CreatedAtAction(nameof(GetRoom), new { id = newRoom.Id }, newRoom);
        }

        [HttpPost("{roomName}/chat")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme + ",ApiKey")]
        public async Task<IActionResult> PostChatMessage(string roomName, [FromBody] ChatMessageRequest request)
        {
            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
            {
                return Unauthorized();
            }

            var savedMessage = await _roomService.SaveMessageAsync(roomName, username, request.Content);

            if (savedMessage == null)
            {
                return BadRequest(new { message = "Could not save message. The room or user may not exist." });
            }

            return Ok(savedMessage);
        }

        [HttpDelete("chat/{messageId}")]
        public async Task<IActionResult> DeleteChatMessage(int messageId)
        {
            var username = User.Identity?.Name;
            if (string.IsNullOrEmpty(username))
            {
                return Unauthorized();
            }

            var success = await _roomService.DeleteMessageAsync(messageId, username);
            if (!success)
            {
                return Forbid();
            }

            return NoContent();  
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetRoom(int id)
        {
            var room = await _roomService.GetRoomByIdAsync(id);
            if (room == null) return NotFound();
            return Ok(room);
        }

        [HttpGet("{roomId}/chat")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme + ",ApiKey")]
        public async Task<IActionResult> GetChatHistory(string roomId)
        {
            var messages = await _roomService.GetChatHistoryAsync(roomId);
            return Ok(messages);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateRoom(int id, [FromBody] RoomRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var updatedRoom = await _roomService.UpdateRoomAsync(id, request.Name);
            if (updatedRoom == null)
            {
                return NotFound(new { message = "Room not found or name is already taken." });
            }
            return Ok(updatedRoom);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteRoom(int id)
        {
            var success = await _roomService.DeleteRoomAsync(id);
            if (!success)
            {
                return NotFound(new { message = "Room not found." });
            }
            return NoContent();
        }
    }
}