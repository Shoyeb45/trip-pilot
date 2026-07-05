import { useEffect, useId, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { Loader2, MapPin } from "lucide-react";
import { getLocations } from "../../network/location-search";
import type { Location } from "../../types/location-search";

const inputClassName =
  "bg-surface-elevated border-border text-text font-body w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60";

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 500;

interface LocationSearchInputProps {
  label: string;
  value: Location | null;
  onChange: (location: Location | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function LocationSearchInput({
  label,
  value,
  onChange,
  disabled = false,
  placeholder = "Search city, state, or country",
}: LocationSearchInputProps) {
  const listboxId = useId();
  const [query, setQuery] = useState(value?.displayName ?? "");
  const [results, setResults] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const canSearch =
    !disabled &&
    query.trim().length >= MIN_QUERY_LENGTH &&
    !(value && query === value.displayName);

  useEffect(() => {
    if (!canSearch) {
      return;
    }
    
    let cancelled = false;
    
    const timer = window.setTimeout(() => {
      void (async () => {
        setIsLoading(true);
        
        try {
          const locations = await getLocations(query.trim());
          if (cancelled) return;
          setResults(locations);
          setIsOpen(locations.length > 0);
        } catch (error) {
          console.error("=> ", error)
          if (cancelled) return;
          setResults([]);
          setIsOpen(false);
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [canSearch, query]);

  const handleSelect = (location: Location) => {
    onChange(location);
    setQuery(location.displayName);
    setResults([]);
    setIsOpen(false);
    setIsLoading(false);
  };

  const handleInputChange = (nextQuery: string) => {
    setQuery(nextQuery);
    setResults([]);
    setIsOpen(false);
    setIsLoading(false);

    if (value && nextQuery !== value.displayName) {
      onChange(null);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-text-muted font-body text-sm">{label}</label>

      <Popover.Root open={isOpen && !disabled} onOpenChange={setIsOpen}>
        <Popover.Anchor asChild>
          <div className="relative">
            <MapPin className="text-text-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              disabled={disabled}
              placeholder={placeholder}
              onChange={(event) => handleInputChange(event.target.value)}
              onFocus={() => {
                if (results.length > 0 && !disabled) {
                  setIsOpen(true);
                }
              }}
              className={`${inputClassName} pl-9 pr-9`}
              autoComplete="off"
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={listboxId}
            />
            {isLoading && canSearch && (
              <Loader2 className="text-text-subtle absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />
            )}
          </div>
        </Popover.Anchor>

        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className="bg-surface-elevated border-border z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-md border shadow-lg"
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <ScrollArea.Root className="max-h-56">
              <ScrollArea.Viewport className="p-1">
                <ul id={listboxId} role="listbox">
                  {results.map((location) => (
                    <li key={`${location.place_id}-${location.displayName}`}>
                      <button
                        type="button"
                        role="option"
                        onClick={() => handleSelect(location)}
                        className="text-text hover:bg-surface font-body w-full rounded-md px-3 py-2 text-left text-sm transition-colors"
                      >
                        {location.displayName}
                      </button>
                    </li>
                  ))}
                </ul>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar
                orientation="vertical"
                className="flex w-1.5 touch-none p-0.5"
              >
                <ScrollArea.Thumb className="bg-border relative flex-1 rounded-full" />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {query.trim().length > 0 &&
        query.trim().length < MIN_QUERY_LENGTH &&
        !disabled && (
          <p className="text-text-subtle font-body text-xs">
            Type at least {MIN_QUERY_LENGTH} characters to search
          </p>
        )}
    </div>
  );
}
