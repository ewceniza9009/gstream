using gstream.Data;
using gstream.Models.Data;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace gstream.Services
{
    public class RedisBroadcastStateService : IBroadcastStateService
    {
        private readonly IDatabase _db;
        private readonly IConnectionMultiplexer _redis;
        private readonly IServiceScopeFactory _scopeFactory;
        private const string BroadcastKeyPrefix = "gstream:broadcast:";
        private const string ConnectionKeyPrefix = "gstream:connection:";
        private const string BroadcastTypeKeySuffix = ":type";
        private static readonly TimeSpan KeyExpiry = TimeSpan.FromHours(4);

        public RedisBroadcastStateService(IConnectionMultiplexer redis, IServiceScopeFactory scopeFactory)
        {
            _redis = redis;
            _db = redis.GetDatabase();
            _scopeFactory = scopeFactory;
        }

        private string GetBroadcastKey(string roomId) => $"{BroadcastKeyPrefix}{roomId}";
        private string GetBroadcastTypeKey(string roomId) => $"{GetBroadcastKey(roomId)}{BroadcastTypeKeySuffix}";
        private string GetConnectionKey(string connectionId) => $"{ConnectionKeyPrefix}{connectionId}";

        public async Task<bool> IsBroadcastActiveAsync(string roomId)
        {
            return await _db.KeyExistsAsync(GetBroadcastKey(roomId));
        }

        public async Task<string?> GetBroadcasterConnectionIdAsync(string roomId)
        {
            return await _db.StringGetAsync(GetBroadcastKey(roomId));
        }

        public async Task<string?> GetBroadcastTypeAsync(string roomId)
        {
            return await _db.StringGetAsync(GetBroadcastTypeKey(roomId));
        }

        public async Task StartBroadcastAsync(string roomId, string broadcasterIdentity, string broadcastType, string? connectionId = null)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var user = await context.Users.FirstOrDefaultAsync(u => u.Username == broadcasterIdentity);
            if (user == null) throw new InvalidOperationException("Broadcaster user not found.");

            var room = await context.Rooms.FirstOrDefaultAsync(r => r.Name == roomId);

            if (room != null)
            {
                room.Status = RoomStatus.Broadcasting;
                room.BroadcasterId = user.Id;       
                room.EndedAt = null;      
            }
            else
            {
                room = new Room
                {
                    Name = roomId,
                    Status = RoomStatus.Broadcasting,
                    BroadcasterId = user.Id,
                    CreatedAt = DateTime.UtcNow
                };
                context.Rooms.Add(room);
            }

            await context.SaveChangesAsync();

            var redisValue = broadcastType == "mesh" && connectionId != null ? connectionId : broadcasterIdentity;
            var batch = _db.CreateBatch();
            batch.StringSetAsync(GetBroadcastKey(roomId), redisValue, KeyExpiry);
            batch.StringSetAsync(GetBroadcastTypeKey(roomId), broadcastType, KeyExpiry);
            if (connectionId != null)
            {
                batch.StringSetAsync(GetConnectionKey(connectionId), $"broadcaster:{roomId}", KeyExpiry);
            }
            batch.Execute();
        }

        public async Task EndBroadcastAsync(string roomId, string broadcasterIdentity)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var room = await context.Rooms.FirstOrDefaultAsync(r => r.Name == roomId && r.Status == RoomStatus.Broadcasting);
            if (room != null)
            {
                var user = await context.Users.FirstOrDefaultAsync(u => u.Username == broadcasterIdentity);
                if (user != null && room.BroadcasterId == user.Id)
                {
                    room.Status = RoomStatus.Ended;
                    room.EndedAt = DateTime.UtcNow;
                    await context.SaveChangesAsync();
                }
            }

            var server = _redis.GetServer(_redis.GetEndPoints().First());
            var pattern = $"{BroadcastKeyPrefix}{roomId}*";
            var keysToDelete = server.Keys(pattern: pattern).ToArray();
            if (keysToDelete.Any())
            {
                await _db.KeyDeleteAsync(keysToDelete);
            }
        }

        public async Task SaveChatMessageAsync(string roomId, string username, string message)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var room = await context.Rooms.FirstOrDefaultAsync(r => r.Name == roomId);
            var user = await context.Users.FirstOrDefaultAsync(u => u.Username == username);

            if (room != null && user != null)
            {
                var chatMessage = new ChatMessage
                {
                    Content = message,
                    RoomId = room.Id,
                    UserId = user.Id,
                    Timestamp = DateTime.UtcNow
                };
                context.ChatMessages.Add(chatMessage);
                await context.SaveChangesAsync();
            }
        }

        public async Task FlushAllBroadcastsAsync()
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var activeRooms = await context.Rooms.Where(r => r.Status == RoomStatus.Broadcasting).ToListAsync();
            foreach (var room in activeRooms)
            {
                room.Status = RoomStatus.Ended;
                room.EndedAt = DateTime.UtcNow;
            }
            await context.SaveChangesAsync();

            var server = _redis.GetServer(_redis.GetEndPoints().First());
            var keys = server.Keys(pattern: $"{BroadcastKeyPrefix}*").Concat(server.Keys(pattern: $"{ConnectionKeyPrefix}*")).ToArray();
            if (keys.Any())
            {
                await _db.KeyDeleteAsync(keys);
            }
        }

        public async Task AddViewerToBroadcastAsync(string roomId, string connectionId)
        {
            var connectionKey = GetConnectionKey(connectionId);
            await _db.StringSetAsync(connectionKey, $"viewer:{roomId}", KeyExpiry);
        }

        public async Task RemoveViewerFromBroadcastAsync(string roomId, string connectionId)
        {
            await _db.KeyDeleteAsync(GetConnectionKey(connectionId));
        }

        public async Task<(string? roomId, bool isBroadcaster)> GetConnectionInfoAsync(string connectionId)
        {
            string? value = await _db.StringGetAsync(GetConnectionKey(connectionId));
            if (string.IsNullOrEmpty(value)) return (null, false);
            var parts = value.Split(':', 2);
            return parts.Length != 2 ? (null, false) : (parts[1], parts[0] == "broadcaster");
        }
    }
}