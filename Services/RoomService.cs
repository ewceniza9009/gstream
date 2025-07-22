using gstream.Data;
using gstream.Models;
using gstream.Models.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace gstream.Services
{
    public class RoomService : IRoomService
    {
        private readonly ApplicationDbContext _context;

        public RoomService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<RoomDto?> CreateRoomAsync(string name)
        {
            if (await _context.Rooms.AnyAsync(r => r.Name == name))
            {
                return null;
            }

            var room = new Room
            {
                Name = name,
                Status = RoomStatus.Open,
                CreatedAt = DateTime.UtcNow
            };

            _context.Rooms.Add(room);
            await _context.SaveChangesAsync();

            return MapToDto(room);
        }

        public async Task<bool> DeleteRoomAsync(int id)
        {
            var room = await _context.Rooms.FindAsync(id);
            if (room == null)
            {
                return false;
            }

            _context.Rooms.Remove(room);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<RoomDto>> GetAllRoomsAsync()
        {
            var rooms = await _context.Rooms
                .Include(r => r.Broadcaster)
                .OrderBy(r => r.Name)
                .ToListAsync();

            return rooms.Select(MapToDto);
        }

        public async Task<RoomDto?> GetRoomByIdAsync(int id)
        {
            var room = await _context.Rooms
                .Include(r => r.Broadcaster)
                .FirstOrDefaultAsync(r => r.Id == id);

            return room == null ? null : MapToDto(room);
        }

        public async Task<RoomDto?> UpdateRoomAsync(int id, string name)
        {
            var room = await _context.Rooms.FindAsync(id);
            if (room == null)
            {
                return null;
            }

            if (await _context.Rooms.AnyAsync(r => r.Name == name && r.Id != id))
            {
                // This indicates a name conflict. You might want to return a specific error.
                return null;
            }

            room.Name = name;
            await _context.SaveChangesAsync();

            return MapToDto(room);
        }

        // Implementation for the new method
        public async Task<IEnumerable<ChatMessageDto>> GetChatHistoryAsync(string roomName)
        {
            return await _context.ChatMessages
                .AsNoTracking()
                .Where(m => m.Room.Name == roomName)
                .OrderByDescending(m => m.Timestamp)
                .Take(50) // Get the last 50 messages
                .OrderBy(m => m.Timestamp) // Re-order them chronologically
                .Select(m => new ChatMessageDto
                {
                    Username = m.User.Username,
                    Content = m.Content,
                    Timestamp = m.Timestamp
                })
                .ToListAsync();
        }

        private RoomDto MapToDto(Room room)
        {
            return new RoomDto
            {
                Id = room.Id,
                Name = room.Name,
                Status = room.Status.ToString(),
                BroadcasterUsername = room.Broadcaster?.Username
            };
        }
    }
}