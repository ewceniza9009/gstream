namespace gstream.Models
{
    public class UserModel
    {
        public int Id { get; set; }  
        public string? Username { get; set; }
        public string? Password { get; set; }
        public string? UserApiKey { get; set; }
        public string? Role { get; set; }  
        public bool IsBlocked { get; set; }  
    }
}