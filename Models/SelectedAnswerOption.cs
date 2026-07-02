namespace WebTestPortal.Models;

public class SelectedAnswerOption
{
    public int Id { get; set; }

    public int AttemptAnswerId { get; set; }
    public AttemptAnswer AttemptAnswer { get; set; } = null!;

    public int AnswerOptionId { get; set; }
    public AnswerOption AnswerOption { get; set; } = null!;
}
