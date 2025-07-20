using gstream.Models;
using System.Threading.Tasks;

namespace gstream.Services
{
    public interface IUserService
    {
        Task<UserModel?> ValidateUserCredentialsAsync(string username, string password);
        Task<UserModel?> GetUserByApiKeyAsync(string apiKey);
    }
}