using Microsoft.AspNetCore.Mvc;
using gstream.Models;
using gstream.Services;

namespace gstream.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly TokenService _tokenService;
        private static readonly List<UserModel> Users = new List<UserModel>
        {
            new UserModel { Username = "testuser", Password = "password" }
        };

        public AuthController(TokenService tokenService)
        {
            _tokenService = tokenService;
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] UserModel login)
        {
            var user = Users.FirstOrDefault(u => u.Username == login.Username && u.Password == login.Password);

            if (user == null)
            {
                return Unauthorized();
            }

            var token = _tokenService.GenerateToken(user);
            return Ok(new { token });
        }
    }
}
