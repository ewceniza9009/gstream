using gstream.Hubs; // You might need to add this using statement
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;
using System.Linq;

namespace gstream.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Protect the entire controller with JWT authentication
    public class BroadcastController : ControllerBase
    {
        // This static dictionary is a stand-in for a database.
        // It's populated by the BroadcastHub.
        // In a real-world scalable app, you'd use a shared cache like Redis
        // or a database to share state between the Hub and the Controller.
        private static readonly ConcurrentDictionary<string, string> Broadcasters = new();

        /// <summary>
        /// API endpoint for a consumer to get the necessary details to join a broadcast.
        /// </summary>
        /// <param name="roomId">The ID of the room the consumer wants to join.</param>
        /// <returns>Connection details if the broadcast exists, otherwise a NotFound error.</returns>
        [HttpGet("join/{roomId}")]
        public IActionResult JoinBroadcast(string roomId)
        {
            // For this to work, the BroadcastHub needs to populate this dictionary.
            // We will simulate this for now. In a real app, this state must be shared.
            // Let's check if a broadcaster exists for the given room ID.
            // NOTE: This is a simplified check. See the explanation below.

            // The BroadcastHub maintains the true state. We need a way to query it.
            // A simple approach is to make the Broadcasters dictionary in the hub public static.
            // Let's modify the hub to allow this.

            if (!BroadcastHub.DoesBroadcastExist(roomId))
            {
                return NotFound(new { message = "No active broadcast found for the specified room ID." });
            }

            // The broadcast exists. Return the connection info to the consumer.
            var serverUrl = $"{Request.Scheme}://{Request.Host}";

            var response = new
            {
                roomId = roomId,
                signalRHubUrl = $"{serverUrl}/broadcasthub",
                message = "Broadcast found. Use the signalRHubUrl to connect and start the WebRTC handshake."
            };

            return Ok(response);
        }
    }
}
