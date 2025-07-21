using gstream.Data;
using gstream.Models.Data;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace gstream.Services
{
    public class UserService : IUserService
    {
        private readonly ApplicationDbContext _context;

        public UserService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<User?> GetUserByApiKeyAsync(string apiKey)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.UserApiKey == apiKey);
        }

        public async Task<User?> GetUserByUsernameAsync(string username)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
        }

        public async Task<User?> ValidateUserCredentialsAsync(string username, string password)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);

            if (user != null && user.PasswordHash == password)      
            {
                return user;
            }

            return null;
        }
    }
}