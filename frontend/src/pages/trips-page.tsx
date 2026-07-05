import { AddTripButton } from "../components/trips/add-trip-modal";
import { TripsList } from "../components/trips/trips-list";

export function TripsPage() {
  return (
    <div className="mx-auto flex w-full flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-text font-display text-3xl font-bold tracking-wide">
            Trips
          </h1>
          <p className="text-text-muted font-body mt-1 text-sm">
            Manage your trips and generate new trip
          </p>
        </div>

        <AddTripButton />
      </div>

      <TripsList />
    </div>
  );
}
