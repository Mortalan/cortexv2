using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OvertimeApi.Data;
using OvertimeApi.Models;
using System.Threading.Tasks;

namespace OvertimeApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public AuthController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] User loginModel)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == loginModel.Email);
            if (user == null || user.Password != loginModel.Password)
            {
                return Unauthorized(new { message = "Invalid email address or workspace credentials." });
            }

            return Ok(new { email = user.Email, role = user.Role });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] User newUser, [FromQuery] string adminEmail)
        {
            // Gatekeeper verification checking that the request originates from a confirmed administrator account
            var adminUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == adminEmail && u.Role == "Admin");
            if (adminUser == null)
            {
                return Forbid();
            }

            var userExists = await _context.Users.AnyAsync(u => u.Email == newUser.Email);
            if (userExists)
            {
                return BadRequest(new { message = "An account with that email address already exists." });
            }

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return Ok(new { message = "New employee profile initialized successfully." });
        }
    }
}