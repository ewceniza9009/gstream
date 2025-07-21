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
            if (!ModelState.IsValid || loginRequest.Username == null || loginRequest.Password == null)
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

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] LoginRequest registrationRequest)
        {
            if (!ModelState.IsValid || registrationRequest.Username == null || registrationRequest.Password == null)
            {
                return BadRequest(new { message = "Username and password are required." });
            }

            var (success, message) = await _userService.RegisterUserAsync(registrationRequest.Username, registrationRequest.Password);

            if (!success)
            {
                // 409 Conflict is appropriate if the username is already taken
                return Conflict(new { message });
            }

            return StatusCode(201, new { message });
        }
    }
}