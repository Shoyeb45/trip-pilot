import { useParams } from "react-router-dom";

export function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-text font-display text-3xl font-bold tracking-wide">
          Trip details
        </h1>
        <p className="text-text-muted font-body mt-1 text-sm">
          Trip overview and generated logs
        </p>
      </div>

      <div className="bg-surface border-border rounded-lg border p-6">
        <p className="text-text-muted font-body text-sm">Trip ID</p>
        <p className="text-text font-mono mt-1 text-sm break-all">{tripId}</p>
      </div>
    </div>
  );
}
