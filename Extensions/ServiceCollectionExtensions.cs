using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using System.Reflection;
using WebTestPortal.Data;
using WebTestPortal.Models;
using WebTestPortal.Repositories.Implementations;
using WebTestPortal.Repositories.Interfaces;
using WebTestPortal.Services.Implementations;
using WebTestPortal.Services.Interfaces;

namespace WebTestPortal.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlite(configuration.GetConnectionString("DefaultConnection")));

        services.AddScoped<IRepository<Test>, Repository<Test>>();
        services.AddScoped<IRepository<Question>, Repository<Question>>();
        services.AddScoped<IRepository<TestAttempt>, Repository<TestAttempt>>();
        services.AddScoped<IRepository<AttemptAnswer>, Repository<AttemptAnswer>>();
        services.AddScoped<ITestRepository, TestRepository>();
        services.AddScoped<IQuestionRepository, QuestionRepository>();
        services.AddScoped<IAttemptRepository, AttemptRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IFileStorageService, FileStorageService>();
        services.AddScoped<ITestService, TestService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IAttemptService, AttemptService>();
        services.AddScoped<IAuthService, AuthService>();

        return services;
    }

    public static IServiceCollection AddIdentityServices(this IServiceCollection services)
    {
        services.AddIdentity<User, IdentityRole<int>>(options =>
        {
            options.Password.RequireDigit = false;
            options.Password.RequiredLength = 6;
            options.Password.RequireNonAlphanumeric = false;
            options.Password.RequireUppercase = false;
            options.Password.RequireLowercase = false;
            options.User.RequireUniqueEmail = true;
        })
        .AddEntityFrameworkStores<AppDbContext>()
        .AddDefaultTokenProviders();

        // IMPORTANT: AuthController.Login manually signs in to the
        // CookieAuthenticationDefaults.AuthenticationScheme ("Cookies")
        // scheme, NOT Identity's own "Identity.Application" scheme that
        // ConfigureApplicationCookie/AddIdentity configures. AddIdentity()
        // never registers a "Cookies" handler, so without this explicit
        // registration you get: "No sign-in authentication handler is
        // registered for the scheme 'Cookies'." We register it here and
        // make it the default scheme so [Authorize] validates against it.
        services.AddAuthentication(options =>
        {
            options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
            options.DefaultAuthenticateScheme = CookieAuthenticationDefaults.AuthenticationScheme;
            options.DefaultSignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        })
        .AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, options =>
        {
            options.Cookie.Name = "WebTestPortal.Auth";
            options.ExpireTimeSpan = TimeSpan.FromHours(8);
            options.SlidingExpiration = true;

            // This is now an API-only backend (the frontend is static HTML +
            // fetch under wwwroot/). The default cookie-auth behaviour issues
            // a 302 redirect to a Login/AccessDenied MVC route on auth
            // failure, but those routes no longer exist, and fetch() would
            // follow the redirect silently instead of seeing a clean error.
            // Return plain status codes instead; the frontend's Api.js
            // already treats a non-2xx response as "not logged in" and
            // redirects to /login.html itself.
            options.Events.OnRedirectToLogin = context =>
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            };
            options.Events.OnRedirectToAccessDenied = context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            };
        });

        return services;
    }

    public static IServiceCollection AddSwaggerServices(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo
            {
                Title = "Web Portal for Tests API",
                Version = "v1",
                Description = "API for creating tests (admin) and taking tests (students)."
            });

            // Only document real REST API controllers ([ApiController]).
            // Without this, Swashbuckle also tries to describe the plain MVC
            // controllers (Admin/Student/Account) that return Views with
            // conventional routing, which is a common cause of a 500 when
            // generating /swagger/v1/swagger.json.
            c.DocInclusionPredicate((docName, apiDesc) =>
                apiDesc.ActionDescriptor is Microsoft.AspNetCore.Mvc.Controllers.ControllerActionDescriptor cad
                && cad.ControllerTypeInfo.GetCustomAttribute<Microsoft.AspNetCore.Mvc.ApiControllerAttribute>() != null);

            // Safety net: if two actions still resolve to the same path/verb,
            // keep the first instead of throwing at doc-generation time.
            c.ResolveConflictingActions(apiDescriptions => apiDescriptions.First());
        });

        return services;
    }
}
