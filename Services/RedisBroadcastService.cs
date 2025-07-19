using StackExchange.Redis;
using System.Threading.Tasks;

namespace gstream.Services
{
    public class RedisBroadcastStateService : IBroadcastStateService
    {
        private readonly IDatabase _db;
        private const string BroadcastKeyPrefix = "gstream:broadcast:";
        private const string ConnectionKeyPrefix = "gstream:connection:";
        private static readonly TimeSpan KeyExpiry = TimeSpan.FromHours(4);

        public RedisBroadcastStateService(IConnectionMultiplexer redis)
        {
            _db = redis.GetDatabase();
        }

        private string GetBroadcastKey(string roomId) => $"{BroadcastKeyPrefix}{roomId}";
        private string GetConnectionKey(string connectionId) => $"{ConnectionKeyPrefix}{connectionId}";

        public async Task<bool> IsBroadcastActiveAsync(string roomId)
        {
            return await _db.KeyExistsAsync(GetBroadcastKey(roomId));
        }

        public async Task<string?> GetBroadcasterConnectionIdAsync(string roomId)
        {
            return await _db.StringGetAsync(GetBroadcastKey(roomId));
        }

        public async Task StartBroadcastAsync(string roomId, string connectionId)
        {
            var broadcastKey = GetBroadcastKey(roomId);
            var connectionKey = GetConnectionKey(connectionId);
            await _db.StringSetAsync(broadcastKey, connectionId, KeyExpiry);
            await _db.StringSetAsync(connectionKey, $"broadcaster:{roomId}", KeyExpiry);
        }

        public async Task EndBroadcastAsync(string roomId, string connectionId)
        {
            var broadcastKey = GetBroadcastKey(roomId);
            var connectionKey = GetConnectionKey(connectionId);
            await _db.KeyDeleteAsync(broadcastKey);
            await _db.KeyDeleteAsync(connectionKey);
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
            var connectionKey = GetConnectionKey(connectionId);
            string? value = await _db.StringGetAsync(connectionKey);
            if (string.IsNullOrEmpty(value))
            {
                return (null, false);
            }

            var parts = value.Split(':', 2);
            if (parts.Length != 2) return (null, false);

            var role = parts[0];
            var roomId = parts[1];
            return (roomId, role == "broadcaster");
        }
    }
}