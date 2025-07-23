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

        public async Task<ChatMessageDto?> SaveMessageAsync(string roomName, string username, string content)
        {
            var room = await _context.Rooms.FirstOrDefaultAsync(r => r.Name == roomName);
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);

            if (room == null || user == null) return null;

            var chatMessage = new ChatMessage
            {
                Content = content,
                RoomId = room.Id,
                UserId = user.Id,
                Timestamp = DateTime.UtcNow
            };
            _context.ChatMessages.Add(chatMessage);
            await _context.SaveChangesAsync();

            return new ChatMessageDto
            {
                Id = chatMessage.Id,
                Username = user.Username,
                Content = chatMessage.Content,
                Timestamp = chatMessage.Timestamp
            };
        }

        public async Task<bool> DeleteMessageAsync(int messageId, string requestingUsername)
        {
            var message = await _context.ChatMessages
                .Include(m => m.Room)
                .ThenInclude(r => r!.Broadcaster)
                .Include(m => m.User)
                .FirstOrDefaultAsync(m => m.Id == messageId);

            if (message == null) return false;

            var requestingUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == requestingUsername);
            if (requestingUser == null) return false;

            bool isBroadcaster = message.Room?.Broadcaster?.Username == requestingUsername;
            bool isAdmin = requestingUser.Role == UserRole.Admin;
            bool isAuthor = message.User!.Username == requestingUsername;

            if (isBroadcaster || isAdmin || isAuthor)
            {
                _context.ChatMessages.Remove(message!);
                await _context.SaveChangesAsync();
                return true;
            }

            return false;
        }

        public async Task<IEnumerable<ChatMessageDto>> GetChatHistoryAsync(string roomName)
        {
            return await _context.ChatMessages
                .AsNoTracking()
                .Where(m => m.Room!.Name == roomName)
                .OrderByDescending(m => m.Timestamp)
                .Take(50)
                .OrderBy(m => m.Timestamp)
                .Select(m => new ChatMessageDto
                {
                    Id = m.Id,
                    Username = m.User!.Username,
                    Content = m.Content,
                    Timestamp = m.Timestamp
                })
                .ToListAsync();
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
                return null;
            }

            room.Name = name;
            await _context.SaveChangesAsync();

            return MapToDto(room);
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