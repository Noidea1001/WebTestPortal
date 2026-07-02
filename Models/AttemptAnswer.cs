namespace WebTestPortal.Models;

public class AttemptAnswer
{
    public int Id { get; set; }

    public int TestAttemptId { get; set; }
    public TestAttempt TestAttempt { get; set; } = null!;

    public int QuestionId { get; set; }
    public Question Question { get; set; } = null!;

    // Filled in once the attempt is graded.
    public bool IsCorrect { get; set; }

    public double ScoreAwarded { get; set; }

    // The option(s) the student selected for this question (many-to-many via this join entity).
    public ICollection<SelectedAnswerOption> SelectedOptions { get; set; } = new List<SelectedAnswerOption>();
}
