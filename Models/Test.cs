namespace WebTestPortal.Models;

public class Test
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    // How many times a student is allowed to attempt this test.
    public int MaxAttempts { get; set; } = 1;

    // Nullable or 0 means the test is untimed.
    public int? TimeLimitMinutes { get; set; }

    // Drafts are only visible to the admin who owns them; published tests are visible to students.
    public bool IsPublished { get; set; } = false;

    // When true, each student attempt gets its own random question order (like a real
    // proctored exam) instead of everyone seeing questions in the same OrderIndex order.
    public bool ShuffleQuestions { get; set; } = true;

    // When true, each student attempt gets its own random answer-option order per question.
    public bool ShuffleOptions { get; set; } = true;

    // Minimum percentage score required to pass (0–100). Null means no pass/fail threshold.
    public double? PassingScorePercent { get; set; }

    // When true, students see their score and results immediately after submission.
    public bool ShowResultsImmediately { get; set; } = true;

    // When true, the correct answers are revealed on the results page.
    public bool ShowCorrectAnswers { get; set; } = true;

    // When true, students can revisit their answers in the results review.
    public bool AllowReview { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int CreatedByUserId { get; set; }
    public User CreatedBy { get; set; } = null!;

    public ICollection<Question> Questions { get; set; } = new List<Question>();

    public ICollection<TestAttempt> Attempts { get; set; } = new List<TestAttempt>();
}

