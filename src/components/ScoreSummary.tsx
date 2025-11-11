import { Card, CardContent } from "./ui/card";

interface ScoreSummaryProps {
  score: number; // Wynik w procentach (0-100)
}

export function ScoreSummary({ score }: ScoreSummaryProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreText = (score: number) => {
    if (score >= 80) return "Świetnie!";
    if (score >= 60) return "Dobrze!";
    if (score >= 40) return "Może być lepiej";
    return "Spróbuj ponownie";
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6">
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${score}, 100`}
                className="text-muted-foreground"
              />
              <path
                d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${score}, 100`}
                className={getScoreColor(score)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}%</span>
            </div>
          </div>
          <h3 className="text-xl font-semibold mb-2">{getScoreText(score)}</h3>
          <p className="text-muted-foreground">Twój wynik: {score}% poprawnych odpowiedzi</p>
        </div>
      </CardContent>
    </Card>
  );
}
