import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { EmptyMessage } from "@/components/ui/StateMessages";

// Stands in for screens that are built in later phases, so the sidebar links already lead somewhere real.
export function PlaceholderPage({ name }: { name: string }) {
  return (
    <Card className="mx-auto mt-8 max-w-lg">
      <EmptyMessage
        title={`${name} is coming soon`}
        hint="This screen is built in a later phase."
        action={
          <Link to="/dashboard" className="btn btn-secondary">
            Back to dashboard
          </Link>
        }
      />
    </Card>
  );
}
