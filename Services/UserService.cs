using gstream.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace gstream.Services
{
    public class UserService : IUserService
    {
        private static readonly List<UserModel> Users = new List<UserModel>
        {
            new UserModel { Username = "testuser", Password = "password", UserApiKey = "testUserApiKey" },
            new UserModel { Username = "anotheruser", Password = "anotherpassword", UserApiKey = "anotherUserApiKey123" }
        };

        public Task<UserModel?> ValidateUserCredentialsAsync(string username, string password)
        {
            var user = Users.FirstOrDefault(u => u.Username == username && u.Password == password);
            return Task.FromResult(user);
        }

        public Task<UserModel?> GetUserByApiKeyAsync(string apiKey)
        {
            var user = Users.FirstOrDefault(u => u.UserApiKey == apiKey);
            return Task.FromResult(user);
        }
    }
}