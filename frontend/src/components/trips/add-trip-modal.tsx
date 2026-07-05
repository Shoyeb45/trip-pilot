import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import * as Checkbox from "@radix-ui/react-checkbox";
import * as Dialog from "@radix-ui/react-dialog";
import * as Label from "@radix-ui/react-label";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../network/api-client";
import { createTrip } from "../../network/trips-api";
import type { Location } from "../../types/location-search";
import { toTripLocationPayload } from "../../types/trip";
import { LocationSearchInput } from "./location-search-input";

const inputClassName =
  "bg-surface-elevated border-border text-text font-body w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-primary";

interface AddTripModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTripModal({ open, onOpenChange }: AddTripModalProps) {
  const navigate = useNavigate();
  const [truckNumber, setTruckNumber] = useState("");
  const [tailorNumber, setTailorNumber] = useState("");
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropLocation, setDropLocation] = useState<Location | null>(null);
  const [pickupSameAsCurrent, setPickupSameAsCurrent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTruckNumber("");
    setTailorNumber("");
    setCurrentLocation(null);
    setPickupLocation(null);
    setDropLocation(null);
    setPickupSameAsCurrent(false);
  };

  const handleCurrentLocationChange = (location: Location | null) => {
    setCurrentLocation(location);
    if (pickupSameAsCurrent) {
      setPickupLocation(location);
    }
  };

  const handlePickupSameAsCurrentChange = (checked: boolean) => {
    setPickupSameAsCurrent(checked);
    if (checked) {
      setPickupLocation(currentLocation);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const pickup = pickupSameAsCurrent ? currentLocation : pickupLocation;

    if (!currentLocation || !pickup || !dropLocation) {
      toast.error("Please select all required locations");
      return;
    }

    if (!truckNumber || !tailorNumber) {
      toast.error("Please enter truck and trailer numbers");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await createTrip({
        truck_number: Number(truckNumber),
        tailor_number: Number(tailorNumber),
        current_location: toTripLocationPayload(currentLocation),
        pickup_location: toTripLocationPayload(pickup),
        drop_location: toTripLocationPayload(dropLocation),
      });

      toast.success("Trip added successfully");
      resetForm();
      onOpenChange(false);
      navigate(`/dashboard/trips/${response.id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          resetForm();
        }
        onOpenChange(nextOpen);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px]" />
        <Dialog.Content className="bg-surface border-border fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border shadow-xl">
          <div className="border-border flex items-start justify-between border-b px-6 py-5">
            <div>
              <Dialog.Title className="text-text font-display text-2xl font-bold tracking-wide">
                Add trip
              </Dialog.Title>
              <Dialog.Description className="text-text-muted font-body mt-1 text-sm">
                Enter trip details and select locations
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="text-text-muted hover:text-text rounded-md p-1 transition-colors"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
            <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label.Root htmlFor="truck-number" className="text-text-muted font-body text-sm">
                    Truck number
                  </Label.Root>
                  <input
                    id="truck-number"
                    type="number"
                    required
                    min={1}
                    value={truckNumber}
                    onChange={(event) => setTruckNumber(event.target.value)}
                    className={inputClassName}
                    placeholder="101"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label.Root htmlFor="tailor-number" className="text-text-muted font-body text-sm">
                    Trailer number
                  </Label.Root>
                  <input
                    id="tailor-number"
                    type="number"
                    required
                    min={1}
                    value={tailorNumber}
                    onChange={(event) => setTailorNumber(event.target.value)}
                    className={inputClassName}
                    placeholder="202"
                  />
                </div>
              </div>

              <LocationSearchInput
                label="Current location"
                value={currentLocation}
                onChange={handleCurrentLocationChange}
                placeholder="Where are you now?"
              />

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox.Root
                    id="pickup-same-as-current"
                    checked={pickupSameAsCurrent}
                    onCheckedChange={(checked) =>
                      handlePickupSameAsCurrentChange(checked === true)
                    }
                    className="border-border bg-surface-elevated data-[state=checked]:bg-primary data-[state=checked]:border-primary flex size-4 items-center justify-center rounded border transition-colors"
                  >
                    <Checkbox.Indicator>
                      <Check className="text-primary-foreground size-3" strokeWidth={3} />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <Label.Root
                    htmlFor="pickup-same-as-current"
                    className="text-text font-body cursor-pointer text-sm"
                  >
                    Pickup location is same as current location
                  </Label.Root>
                </div>

                <LocationSearchInput
                  key={
                    pickupSameAsCurrent
                      ? `same-${currentLocation?.place_id ?? "none"}`
                      : "pickup"
                  }
                  label="Pickup location"
                  value={pickupSameAsCurrent ? currentLocation : pickupLocation}
                  onChange={setPickupLocation}
                  disabled={pickupSameAsCurrent}
                  placeholder="Pickup address"
                />
              </div>

              <LocationSearchInput
                label="Drop location"
                value={dropLocation}
                onChange={setDropLocation}
                placeholder="Delivery address"
              />
            </div>

            <div className="border-border flex items-center justify-end gap-3 border-t px-6 py-4">
              <Dialog.Close asChild>
                <button
                  type="button"
                  disabled={isSubmitting}
                  className="text-text-muted hover:text-text font-body rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary text-primary-foreground font-body rounded-md px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? "Adding trip..." : "Add trip"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function AddTripButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-text border-border hover:bg-surface-elevated font-body flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors"
      >
        <Plus className="size-4" strokeWidth={1.75} />
        Add trip
      </button>
      <AddTripModal open={open} onOpenChange={setOpen} />
    </>
  );
}
