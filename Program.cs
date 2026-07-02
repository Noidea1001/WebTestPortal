using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using WebTestPortal.Extensions;
using WebTestPortal.Filters;
using WebTestPortal.Models;
using WebTestPortal.Repositories.Implementations;

var builder = WebApplication.CreateBuilder(args);

// API-only now: the frontend is plain HTML + fetch under wwwroot/, served as
// static files. AddControllers (not AddControllersWithViews/AddRazorPages)
// since there are no .cshtml views left to render.
builder.Services.AddControllers(options =>
{
    options.Filters.Add<ApiExceptionFilter>();
})
.AddJsonOptions(options =>
{
    // See UtcDateTimeConverter for why this is necessary — without it, SQLite's loss of
    // DateTimeKind causes every timestamp in the UI to silently render in the wrong timezone.
    options.JsonSerializerOptions.Converters.Add(new WebTestPortal.Extensions.UtcDateTimeConverter());
    options.JsonSerializerOptions.Converters.Add(new WebTestPortal.Extensions.UtcNullableDateTimeConverter());
});
builder.Services.AddApplicationServices(builder.Configuration);
builder.Services.AddIdentityServices();
builder.Services.AddSwaggerServices();

var app = builder.Build();

await DbInitializer.SeedAsync(app.Services);

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseHsts();
}

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Web Portal for Tests API v1");
});

app.UseDefaultFiles();   // serves wwwroot/index.html for "/"
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
