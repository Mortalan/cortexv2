using Microsoft.EntityFrameworkCore;
using OvertimeApi.Models;

namespace OvertimeApi.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<OvertimeRecord> OvertimeRecords { get; set; }
        public DbSet<User> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Automatically seed your master administrative root credentials securely
            modelBuilder.Entity<User>().HasData(new User
            {
                Id = Guid.Parse("a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"),
                Email = "byron@fits.net.za",
                Password = "Fits2026!",
                Role = "Admin"
            });
        }
    }
}