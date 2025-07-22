using Microsoft.AspNetCore.Mvc;
using gstream.Models;
using gstream.Services;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

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
                return Unauthorized(new { message = "Invalid username or password, or account is blocked." });
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
                return Conflict(new { message });
            }

            return StatusCode(201, new { message });
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized();
            }

            var (success, message) = await _userService.ChangePasswordAsync(userId, request.OldPassword, request.NewPassword);

            if (!success)
            {
                return BadRequest(new { message });
            }

            return Ok(new { message });
        }
    }
}