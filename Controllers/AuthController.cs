using Microsoft.AspNetCore.Mvc;
using gstream.Models;
using gstream.Services;
using System.Threading.Tasks;
using gstream.Models.Data;     

namespace gstream.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly TokenService _tokenService;
        private readonly IUserService _userService;

        public AuthController(TokenService tokenService, IUserService userService)
        {
            _tokenService = tokenService;
            _userService = userService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest loginRequest)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (string.IsNullOrEmpty(loginRequest.Username) || string.IsNullOrEmpty(loginRequest.Password))
            {
                return BadRequest(new { message = "Username and password are required." });
            }

            var user = await _userService.ValidateUserCredentialsAsync(loginRequest.Username, loginRequest.Password);

            if (user == null)
            {
                return Unauthorized(new { message = "Invalid username or password." });
            }

            var token = _tokenService.GenerateToken(user);
            return Ok(new { token });
        }
    }
}