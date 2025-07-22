using gstream.Models;
using gstream.Models.Data;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace gstream.Services
{
    public interface IUserService
    {
        Task<User?> ValidateUserCredentialsAsync(string username, string password);
        Task<User?> GetUserByApiKeyAsync(string apiKey);
        Task<User?> GetUserByUsernameAsync(string username);
        Task<(bool Success, string Message)> RegisterUserAsync(string username, string password);
        Task<(bool Success, string Message)> ChangePasswordAsync(int userId, string oldPassword, string newPassword);
        Task<string?> RegenerateApiKeyAsync(int userId);

        // Admin Methods
        Task<IEnumerable<UserModel>> GetAllUsersAsync();
        Task<bool> UpdateUserAsync(int userId, UserModel model);
        Task<bool> DeleteUserAsync(int userId);
    }
}