// Models/UserModel.cs
namespace gstream.Models
{
    public class UserModel
    {
        public string Username { get; set; }
        public string Password { get; set; } // In a real app, store a hashed password
    }
}
