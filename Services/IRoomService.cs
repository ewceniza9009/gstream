using gstream.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace gstream.Services
{
    public interface IRoomService
    {
        Task<IEnumerable<RoomDto>> GetAllRoomsAsync();
        Task<RoomDto?> GetRoomByIdAsync(int id);
        Task<RoomDto?> CreateRoomAsync(string name);
        Task<RoomDto?> UpdateRoomAsync(int id, string name);
        Task<bool> DeleteRoomAsync(int id);
        Task<IEnumerable<ChatMessageDto>> GetChatHistoryAsync(string roomName);
        Task<ChatMessageDto?> SaveMessageAsync(string roomName, string username, string content);
        Task<bool> DeleteMessageAsync(int messageId, string requestingUsername);
    }
}