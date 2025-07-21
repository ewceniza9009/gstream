using gstream.Data;
using gstream.Models.Data;
using Microsoft.AspNetCore.Identity;     
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace gstream.Services
{
    public class UserService : IUserService
    {
        private readonly ApplicationDbContext _context;
        private readonly IPasswordHasher<User> _passwordHasher;

        public UserService(ApplicationDbContext context, IPasswordHasher<User> passwordHasher)
        {
            _context = context;
            _passwordHasher = passwordHasher;
        }

        public async Task<(bool Success, string Message)> RegisterUserAsync(string username, string password)
        {
            if (await _context.Users.AnyAsync(u => u.Username == username))
            {
                return (false, "Username is already taken.");
            }

            var user = new User { Username = username };

            user.PasswordHash = _passwordHasher.HashPassword(user, password);
            user.UserApiKey = $"gsk_{Guid.NewGuid():N}";

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return (true, "Registration successful.");
        }

        public async Task<User?> ValidateUserCredentialsAsync(string username, string password)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null)
            {
                return null;
            }

            var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);

            return result == PasswordVerificationResult.Success ? user : null;
        }

        public async Task<User?> GetUserByApiKeyAsync(string apiKey)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.UserApiKey == apiKey);
        }

        public async Task<User?> GetUserByUsernameAsync(string username)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
        }
    }
}