using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;

namespace WebTestPortal.Filters;

/// <summary>
/// Translates well-known service-layer exceptions into proper HTTP responses, with a
/// consistent JSON shape: { "error": "..." }.
///
/// Only applies to controllers decorated with [ApiController] (the api/* REST endpoints).
/// Classic MVC controllers (Admin, Student, Account, Auth) render Razor views/redirects and
/// already handle their own exceptions with TempData/ModelState, so they are left untouched
/// here to avoid turning a page render into a raw JSON error response.
///
/// Mapping:
///   KeyNotFoundException                          -> 404 Not Found
///   ArgumentException / InvalidOperationException  -> 400 Bad Request
///   UnauthorizedAccessException                    -> 403 Forbidden
///   anything else                                  -> left to the default exception handler
/// </summary>
public class ApiExceptionFilter : IExceptionFilter
{
    private readonly ILogger<ApiExceptionFilter> _logger;

    public ApiExceptionFilter(ILogger<ApiExceptionFilter> logger)
    {
        _logger = logger;
    }

    public void OnException(ExceptionContext context)
    {
        if (!IsApiController(context)) return;

        context.Result = context.Exception switch
        {
            KeyNotFoundException ex => new NotFoundObjectResult(new { message = ex.Message }),
            ArgumentException ex => new BadRequestObjectResult(new { message = ex.Message }),
            InvalidOperationException ex => new BadRequestObjectResult(new { message = ex.Message }),
            UnauthorizedAccessException ex => new ObjectResult(new { message = ex.Message })
            {
                StatusCode = StatusCodes.Status403Forbidden
            },
            _ => null
        };

        if (context.Result != null)
        {
            context.ExceptionHandled = true;
        }
        else
        {
            _logger.LogError(context.Exception, "Unhandled exception in API controller {Controller}",
                context.ActionDescriptor.DisplayName);
        }
    }

    private static bool IsApiController(ExceptionContext context)
    {
        return context.ActionDescriptor is ControllerActionDescriptor cad
               && cad.ControllerTypeInfo.GetCustomAttribute<ApiControllerAttribute>() != null;
    }
}
