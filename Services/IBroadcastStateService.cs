namespace gstream.Services
{
    public interface IBroadcastStateService
    {
        Task<bool> IsBroadcastActiveAsync(string roomId);
        Task<string?> GetBroadcasterConnectionIdAsync(string roomId);
        Task StartBroadcastAsync(string roomId, string connectionId);
        Task EndBroadcastAsync(string roomId, string connectionId);
        Task AddViewerToBroadcastAsync(string roomId, string connectionId);
        Task RemoveViewerFromBroadcastAsync(string roomId, string connectionId);
        Task<(string? roomId, bool isBroadcaster)> GetConnectionInfoAsync(string connectionId);
    }
}