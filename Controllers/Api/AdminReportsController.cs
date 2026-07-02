using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using WebTestPortal.DTOs;
using WebTestPortal.Models;
using WebTestPortal.Services.Interfaces;
using WebTestPortal.ViewModels.Admin;

namespace WebTestPortal.Controllers.Api;

// Read-only reporting endpoints for the Admin area: dashboard stats, results
// overview, per-test results, and a single submission's full detail. These
// used to be server-rendered (AdminController MVC actions); they're exposed
// here as JSON so a plain HTML + fetch frontend can render them instead.
[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminReportsController : ControllerBase
{
    private readonly ITestService _testService;
    private readonly IUserService _userService;
    private readonly IAttemptService _attemptService;
    private readonly UserManager<User> _userManager;

    public AdminReportsController(ITestService testService, IUserService userService, IAttemptService attemptService, UserManager<User> userManager)
    {
        _testService = testService;
        _userService = userService;
        _attemptService = attemptService;
        _userManager = userManager;
    }

    private int CurrentUserId => int.Parse(_userManager.GetUserId(User)!);

    [HttpGet("dashboard")]
    public async Task<ActionResult<AdminDashboardViewModel>> Dashboard()
    {
        var tests = await _testService.GetMyTestsAsync(CurrentUserId);
        var users = await _userService.GetAllUsersAsync();
        var allAttempts = await _attemptService.GetAllAttemptsAsync();
        var totalQuestions = tests.Sum(t => t.QuestionCount);

        var completedAttempts = allAttempts.Where(a => a.IsCompleted).ToList();
        double avgPct = completedAttempts.Count > 0
            ? Math.Round(completedAttempts.Average(a => a.MaxScore <= 0 ? 0 : (a.Score / a.MaxScore) * 100), 1)
            : 0;

        var today = DateTime.Now.Date;
        var weeklyVolume = new List<DailyAttemptCountDto>();
        for (int i = 6; i >= 0; i--)
        {
            var day = today.AddDays(-i);
            var count = allAttempts.Count(a => a.StartedAt.Date == day);
            weeklyVolume.Add(new DailyAttemptCountDto { Label = day.ToString("ddd"), Date = day, Count = count });
        }

        var scoreDistribution = new List<ScoreDistributionBucketDto>
        {
            new() { Label = "0-20%", Count = 0 },
            new() { Label = "20-40%", Count = 0 },
            new() { Label = "40-60%", Count = 0 },
            new() { Label = "60-80%", Count = 0 },
            new() { Label = "80-100%", Count = 0 }
        };

        const double passThreshold = 60.0;
        int passCount = 0, failCount = 0;
        foreach (var attempt in completedAttempts)
        {
            double scorePct = attempt.MaxScore <= 0 ? 0 : (attempt.Score / attempt.MaxScore) * 100;
            if (scorePct < 20) scoreDistribution[0].Count++;
            else if (scorePct < 40) scoreDistribution[1].Count++;
            else if (scorePct < 60) scoreDistribution[2].Count++;
            else if (scorePct < 80) scoreDistribution[3].Count++;
            else scoreDistribution[4].Count++;

            if (scorePct >= passThreshold) passCount++;
            else failCount++;
        }

        var vm = new AdminDashboardViewModel
        {
            TotalTests = tests.Count(),
            PublishedTests = tests.Count(t => t.IsPublished),
            TotalQuestions = totalQuestions,
            TotalUsers = users.Count(),
            TotalAttempts = allAttempts.Count(),
            CompletedAttempts = completedAttempts.Count,
            AverageScorePercentage = avgPct,
            RecentAttempts = allAttempts.Take(5).ToList(),
            WeeklyAttemptVolume = weeklyVolume,
            ScoreDistribution = scoreDistribution,
            PassCount = passCount,
            FailCount = failCount,
            RecentPublishedTests = tests
                .Where(t => t.IsPublished)
                .OrderByDescending(t => t.CreatedAt)
                .Take(6)
                .ToList()
        };

        return Ok(vm);
    }

    [HttpGet("results")]
    public async Task<ActionResult<ResultsListViewModel>> Results()
    {
        var tests = await _testService.GetMyTestsAsync(CurrentUserId);
        var allAttempts = await _attemptService.GetAllAttemptsAsync();

        var testResults = tests.Select(t =>
        {
            var testAttempts = allAttempts.Where(a => a.TestId == t.Id).ToList();
            var completed = testAttempts.Where(a => a.IsCompleted).ToList();
            var avgPct = completed.Any() ? completed.Average(a => a.MaxScore > 0 ? a.Score / a.MaxScore * 100 : 0) : 0;
            var years = testAttempts.Select(a => a.StartedAt.ToLocalTime().Year).Distinct().OrderBy(y => y).ToList();
            return new TestResultSummaryDto
            {
                TestId = t.Id,
                TestTitle = t.Title,
                TotalAttempts = testAttempts.Count,
                CompletedAttempts = completed.Count,
                AverageScore = completed.Any() ? Math.Round(completed.Average(a => a.Score), 1) : 0,
                AveragePercentage = Math.Round(avgPct, 1),
                EarliestAttemptAt = testAttempts.Any() ? testAttempts.Min(a => a.StartedAt) : null,
                LatestAttemptAt = testAttempts.Any() ? testAttempts.Max(a => a.StartedAt) : null,
                AttemptYears = years
            };
        }).ToList();

        return Ok(new ResultsListViewModel { TestResults = testResults });
    }

    [HttpGet("tests/{testId}/results")]
    public async Task<ActionResult<TestResultsViewModel>> TestResults(int testId)
    {
        var test = await _testService.GetTestDetailAsync(CurrentUserId, testId);
        if (test == null) return NotFound();

        var attempts = await _attemptService.GetAttemptsByTestAsync(testId);
        return Ok(new TestResultsViewModel
        {
            TestId = testId,
            TestTitle = test.Title,
            Attempts = attempts.ToList()
        });
    }

    [HttpGet("attempts/{attemptId}")]
    public async Task<ActionResult<AttemptResultDto>> SubmissionDetail(int attemptId)
    {
        try
        {
            var result = await _attemptService.GetAttemptDetailAsync(attemptId);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }
}
