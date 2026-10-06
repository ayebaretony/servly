// "+12% vs last week" in green, "-3% vs last week" in red, or a quiet note when there is nothing to compare with
export function ChangeText({ text, positive }: { text: string | null; positive: boolean }) {
  if (text === null) return <span className="text-muted">Nothing to compare yet</span>;
  return <span className={positive ? "text-success" : "text-danger"}>{text}</span>;
}
