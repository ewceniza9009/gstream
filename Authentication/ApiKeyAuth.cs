using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using gstream.Services;     

namespace gstream.Authentication
{
    public class ApiKeyAuthenticationSchemeOptions : AuthenticationSchemeOptions
    {
        public string HeaderName { get; set; } = "X-Api-Key";
    }

    public class ApiKeyAuthenticationHandler : AuthenticationHandler<ApiKeyAuthenticationSchemeOptions>
    {
        private readonly IUserService _userService;

        public ApiKeyAuthenticationHandler(
            IOptionsMonitor<ApiKeyAuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder,    
            IUserService userService)
            : base(options, logger, encoder)      
        {
            _userService = userService;
        }

        protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            if (!Request.Headers.ContainsKey(Options.HeaderName))
            {
                return AuthenticateResult.NoResult();
            }

            string? apiKey = Request.Headers[Options.HeaderName].FirstOrDefault();

            if (string.IsNullOrEmpty(apiKey))
            {
                return AuthenticateResult.Fail("API Key not found or empty.");
            }

            var user = await _userService.GetUserByApiKeyAsync(apiKey);

            if (user == null)
            {
                return AuthenticateResult.Fail("Invalid API Key.");
            }

            var claims = new[] {
                new Claim(ClaimTypes.NameIdentifier, user.Username!),       
                new Claim(ClaimTypes.Name, user.Username!),                 
            };
            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme.Name);

            return AuthenticateResult.Success(ticket);
        }
    }
}