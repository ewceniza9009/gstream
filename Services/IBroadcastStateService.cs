namespace gstream.Services
{
    public interface IBroadcastStateService
    {
        Task<bool> IsBroadcastActiveAsync(string roomId);
        Task<string?> GetBroadcasterConnectionIdAsync(string roomId);
        Task<string?> GetBroadcastTypeAsync(string roomId);
        Task StartBroadcastAsync(string roomId, string broadcasterIdentity, string broadcastType, string? connectionId = null);
        Task EndBroadcastAsync(string roomId, string broadcasterIdentity);
        Task AddViewerToBroadcastAsync(string roomId, string connectionId);
        Task RemoveViewerFromBroadcastAsync(string roomId, string connectionId);
        Task<(string? roomId, bool isBroadcaster)> GetConnectionInfoAsync(string connectionId);
        Task FlushAllBroadcastsAsync();
        Task<long> GetViewerCountAsync(string roomId);
        Task<long> IncrementViewerCountAsync(string roomId);
        Task<long> DecrementViewerCountAsync(string roomId);
        Task ClearViewerCountAsync(string roomId);
        Task<Dictionary<string, long>> GetAllActiveStreamsAsync();
    }
}