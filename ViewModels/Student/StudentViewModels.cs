using WebTestPortal.DTOs;

namespace WebTestPortal.ViewModels.Student;

public class StudentDashboardViewModel
{
    public List<AvailableTestDto> AvailableTests { get; set; } = new();
    public List<AttemptSummaryDto> AttemptHistory { get; set; } = new();

    // Personal analytics — scoped to this student's own completed attempts only.
    public double AverageScorePercentage { get; set; }
    public List<ScoreDistributionBucketDto> ScoreDistribution { get; set; } = new();
    public int PassCount { get; set; }
    public int FailCount { get; set; }
}

public class ScoreDistributionBucketDto
{
    public string Label { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class TakeTestViewModel
{
    public int AttemptId { get; set; }
    public int TestId { get; set; }
    public string TestTitle { get; set; } = string.Empty;
    public int AttemptNumber { get; set; }
    public int? TimeLimitMinutes { get; set; }
    public DateTime StartedAtUtc { get; set; }
    public DateTime? DeadlineUtc { get; set; }
    public DateTime? LastAutoSavedAtUtc { get; set; }
    public List<QuestionStudentDto> Questions { get; set; } = new();
    public List<QuestionAnswerSubmission> Answers { get; set; } = new();
}

public class QuestionAnswerSubmission
{
    public int QuestionId { get; set; }
    public List<int> SelectedOptionIds { get; set; } = new();
}

public class SubmitTestConfirmationViewModel
{
    public int AttemptId { get; set; }
    public int TestId { get; set; }
    public string TestTitle { get; set; } = string.Empty;
    public int AttemptNumber { get; set; }
    public int TotalQuestions { get; set; }
    public int UnansweredQuestions { get; set; }
    public bool HasUnanswered => UnansweredQuestions > 0;
    public List<QuestionAnswerSubmission> Answers { get; set; } = new();
}
