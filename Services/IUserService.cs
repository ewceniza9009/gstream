using gstream.Models.Data;
using System.Threading.Tasks;

namespace gstream.Services
{
    public interface IUserService
    {
        Task<User?> ValidateUserCredentialsAsync(string username, string password);
        Task<User?> GetUserByApiKeyAsync(string apiKey);
        Task<User?> GetUserByUsernameAsync(string username);
    }
}