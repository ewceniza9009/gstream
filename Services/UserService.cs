using gstream.Data;
using gstream.Models;
using gstream.Models.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
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

            var user = new User
            {
                Username = username,
                Role = UserRole.Consumer   
            };

            user.PasswordHash = _passwordHasher.HashPassword(user, password);
            user.UserApiKey = $"gsk_{Guid.NewGuid():N}";

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return (true, "Registration successful.");
        }

        public async Task<User?> ValidateUserCredentialsAsync(string username, string password)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (user == null || user.IsBlocked)
            {
                return null;
            }

            var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);

            return result == PasswordVerificationResult.Success ? user : null;
        }

        public async Task<User?> GetUserByApiKeyAsync(string apiKey)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserApiKey == apiKey);
            return user == null || user.IsBlocked ? null : user;
        }

        public async Task<User?> GetUserByUsernameAsync(string username)
        {
            return await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
        }

        public async Task<(bool Success, string Message)> ChangePasswordAsync(int userId, string oldPassword, string newPassword)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return (false, "User not found.");
            }

            var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, oldPassword);
            if (verificationResult == PasswordVerificationResult.Failed)
            {
                return (false, "Incorrect old password.");
            }

            user.PasswordHash = _passwordHasher.HashPassword(user, newPassword);
            await _context.SaveChangesAsync();
            return (true, "Password changed successfully.");
        }

        public async Task<string?> RegenerateApiKeyAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return null;

            user.UserApiKey = $"gsk_{Guid.NewGuid():N}";
            await _context.SaveChangesAsync();
            return user.UserApiKey;
        }

        public async Task<IEnumerable<UserModel>> GetAllUsersAsync()
        {
            return await _context.Users
                .AsNoTracking()
                .Select(u => new UserModel
                {
                    Id = u.Id,
                    Username = u.Username,
                    Role = u.Role.ToString(),
                    IsBlocked = u.IsBlocked,
                    UserApiKey = u.UserApiKey
                })
                .ToListAsync();
        }

        public async Task<bool> UpdateUserAsync(int userId, UserModel model)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return false;

            if (Enum.TryParse<UserRole>(model.Role, out var newRole))
            {
                user.Role = newRole;
            }
            user.IsBlocked = model.IsBlocked;

            _context.Users.Update(user);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteUserAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return false;

            if (user.Role == UserRole.Admin)
            {
                var adminCount = await _context.Users.CountAsync(u => u.Role == UserRole.Admin);
                if (adminCount <= 1)
                {
                    return false;        
                }
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}