using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OvertimeApi.Data;
using OvertimeApi.Models;
using OvertimeApi.Services;
using System;
using System.Threading.Tasks;

namespace OvertimeApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OvertimeController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly GlpiTicketService _glpiService;

        public OvertimeController(ApplicationDbContext context, GlpiTicketService glpiService)
        {
            _context = context;
            _glpiService = glpiService;
        }

        [HttpGet("tickets")]
        public async Task<IActionResult> GetUserTickets([FromQuery] string email, [FromQuery] bool isSandbox = false)
        {
            if (string.IsNullOrEmpty(email)) return BadRequest("Email is required.");
            var tickets = await _glpiService.GetActiveTicketsAsync(email, isSandbox);
            return Ok(tickets);
        }

        [HttpGet("all")]
        public async Task<IActionResult> GetAllRecords()
        {
            var records = await _context.OvertimeRecords
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
            return Ok(records);
        }

        [HttpPost("log")]
        public async Task<IActionResult> LogOvertime([FromBody] OvertimeRecord record)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            record.Status = ApprovalStatus.Pending;
            record.CreatedAt = DateTime.UtcNow;

            _context.OvertimeRecords.Add(record);
            await _context.SaveChangesAsync();

            string prefix = record.IsSandbox ? "<strong>[SANDBOX TEST OVERTIME]</strong>" : "<strong>[OVERTIME LOGGED]</strong>";
            string formattedComment = $"{prefix}<br/>" +
                                      $"Hours: {record.HoursClaimed} hours<br/>" +
                                      $"Date: {record.Date:yyyy-MM-dd}<br/>" +
                                      $"Deliverable: {record.DeliverableSummary}";

            await _glpiService.PostTicketCommentAsync(record.TicketingSystemId, formattedComment, record.IsSandbox);

            return Ok(new { message = "Overtime processed successfully.", recordId = record.Id, sandboxMode = record.IsSandbox });
        }
    }
}