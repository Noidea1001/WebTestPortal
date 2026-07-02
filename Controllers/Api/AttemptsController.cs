using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebTestPortal.DTOs;
using WebTestPortal.Services.Interfaces;

namespace WebTestPortal.Controllers.Api;

[ApiController]
[Authorize]
public class AttemptsController : ControllerBase
{
    private readonly IAttemptService _attemptService;

    public AttemptsController(IAttemptService attemptService)
    {
        _attemptService = attemptService;
    }

    private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("api/tests/available")]
    public async Task<ActionResult<List<AvailableTestDto>>> GetAvailableTests()
    {
        var tests = await _attemptService.GetAvailableTestsAsync(CurrentUserId);
        return Ok(tests);
    }

    [HttpPost("api/tests/{testId}/attempts")]
    public async Task<ActionResult<AttemptStartedDto>> StartAttempt(int testId)
    {
        try
        {
            var attempt = await _attemptService.StartAttemptAsync(CurrentUserId, testId);
            var test = await _attemptService.GetTestForAttemptAsync(testId);
            if (test == null) return NotFound();
            var timeLimitMinutes = test.TimeLimitMinutes.GetValueOrDefault();
            var draftAnswers = _attemptService.GetDraftAnswers(attempt);

            return Ok(new AttemptStartedDto
            {
                AttemptId = attempt.Id,
                TestId = test.Id,
                TestTitle = test.Title,
                AttemptNumber = attempt.AttemptNumber,
                StartedAt = attempt.StartedAt,
                TimeLimitMinutes = test.TimeLimitMinutes,
                DeadlineUtc = timeLimitMinutes > 0
                    ? DateTime.SpecifyKind(attempt.StartedAt, DateTimeKind.Utc).AddMinutes(timeLimitMinutes)
                    : null,
                Questions = _attemptService.BuildOrderedQuestionDtos(test, attempt),
                DraftAnswers = draftAnswers.Select(kv => new SubmitAnswerDto
                {
                    QuestionId = kv.Key,
                    SelectedOptionIds = kv.Value
                }).ToList(),
                LastAutoSavedAt = attempt.LastAutoSavedAt,
                FlaggedQuestionIds = _attemptService.GetFlaggedQuestionIds(attempt)
            });
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("api/attempts/{attemptId}/submit")]
    public async Task<ActionResult<AttemptResultDto>> Submit(int attemptId, SubmitAttemptDto dto)
    {
        try
        {
            var result = await _attemptService.SubmitAttemptAsync(CurrentUserId, attemptId, dto);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // Called periodically (and on every answer change, debounced) by the exam page while a
    // student is still working, so their progress survives a refresh or closed tab without
    // needing a real submit. Does not grade anything - just persists the draft answers.
    [HttpPost("api/attempts/{attemptId}/autosave")]
    public async Task<ActionResult<AutoSaveResultDto>> AutoSave(int attemptId, SubmitAttemptDto dto)
    {
        try
        {
            var savedAt = await _attemptService.AutoSaveAsync(CurrentUserId, attemptId, dto);
            return Ok(new AutoSaveResultDto { SavedAtUtc = savedAt });
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("api/attempts/{attemptId}/result")]
    public async Task<ActionResult<AttemptResultDto>> GetResult(int attemptId)
    {
        try
        {
            var result = await _attemptService.GetResultAsync(CurrentUserId, attemptId);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet("api/attempts/my")]
    public async Task<ActionResult<List<AttemptSummaryDto>>> MyAttempts()
    {
        var attempts = await _attemptService.GetMyAttemptsAsync(CurrentUserId);
        return Ok(attempts);
    }
}
