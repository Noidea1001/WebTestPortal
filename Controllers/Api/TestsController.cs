using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebTestPortal.DTOs;
using WebTestPortal.Services.Interfaces;

namespace WebTestPortal.Controllers.Api;

[ApiController]
[Route("api/tests")]
[Authorize(Roles = "Admin")]
public class TestsController : ControllerBase
{
    private readonly ITestService _testService;
    private readonly IWebHostEnvironment _env;
    private static readonly string[] AllowedImageExtensions = { ".png", ".jpg", ".jpeg", ".gif", ".webp" };
    private const long MaxImageBytes = 5 * 1024 * 1024;

    public TestsController(ITestService testService, IWebHostEnvironment env)
    {
        _testService = testService;
        _env = env;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<List<TestSummaryDto>>> GetMyTests()
    {
        var tests = await _testService.GetMyTestsAsync(CurrentUserId);
        return Ok(tests);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TestAdminDetailDto>> GetById(int id)
    {
        var test = await _testService.GetTestDetailAsync(CurrentUserId, id);
        if (test == null) return NotFound();
        return Ok(test);
    }

    [HttpPost]
    public async Task<ActionResult<TestAdminDetailDto>> Create(TestUpsertDto dto)
    {
        var test = await _testService.CreateTestAsync(CurrentUserId, dto);
        return CreatedAtAction(nameof(GetById), new { id = test.Id }, await _testService.GetTestDetailAsync(CurrentUserId, test.Id));
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, TestUpsertDto dto)
    {
        await _testService.UpdateTestMetadataAsync(CurrentUserId, id, dto);
        return NoContent();
    }

    [HttpPost("{id}/publish")]
    public async Task<IActionResult> SetPublished(int id, [FromQuery] bool published = true)
    {
        await _testService.PublishTestAsync(CurrentUserId, id, published);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        await _testService.DeleteTestAsync(CurrentUserId, id);
        return NoContent();
    }

    [HttpPost("{testId}/questions")]
    public async Task<ActionResult<QuestionAdminDto>> AddQuestion(int testId, QuestionUpsertDto dto)
    {
        var question = await _testService.AddQuestionAsync(CurrentUserId, testId, dto);
        var detail = await _testService.GetTestDetailAsync(CurrentUserId, testId);
        var questionDto = detail?.Questions.FirstOrDefault(q => q.Id == question.Id);
        return questionDto != null ? Ok(questionDto) : NotFound();
    }

    [HttpPut("{testId}/questions/{questionId}")]
    public async Task<ActionResult<QuestionAdminDto>> UpdateQuestion(int testId, int questionId, QuestionUpsertDto dto)
    {
        try
        {
            await _testService.UpdateQuestionAsync(CurrentUserId, testId, questionId, dto);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }

        var detail = await _testService.GetTestDetailAsync(CurrentUserId, testId);
        var questionDto = detail?.Questions.FirstOrDefault(q => q.Id == questionId);
        return questionDto != null ? Ok(questionDto) : NotFound();
    }

    [HttpDelete("{testId}/questions/{questionId}")]
    public async Task<IActionResult> DeleteQuestion(int testId, int questionId)
    {
        try
        {
            await _testService.DeleteQuestionAsync(CurrentUserId, testId, questionId);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        return NoContent();
    }

    [HttpPost("{testId}/questions/{questionId}/image")]
    [RequestSizeLimit(MaxImageBytes)]
    public async Task<ActionResult<object>> UploadQuestionImage(int testId, int questionId, IFormFile file)
    {
        if (file is null || file.Length == 0) return BadRequest(new { message = "No file uploaded." });
        if (file.Length > MaxImageBytes) return BadRequest(new { message = "Image too large (max 5 MB)." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedImageExtensions.Contains(ext))
        {
            return BadRequest(new { message = "Unsupported image type. Allowed: png, jpg, jpeg, gif, webp." });
        }

        try
        {
            using var stream = file.OpenReadStream();
            var imagePath = await _testService.UploadQuestionImageAsync(CurrentUserId, testId, questionId, file.FileName, file.Length, stream);
            if (imagePath == null) return BadRequest(new { message = "Failed to upload image." });

            return Ok(new { imagePath });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
