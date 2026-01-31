import { Plus, Star } from "lucide-react";
import * as React from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface ComboboxGroup<T extends ComboboxOption> {
  label: string;
  options: T[];
}

interface ComboboxProps<T extends ComboboxOption>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "onSelect"> {
  options?: T[];
  groups?: ComboboxGroup<T>[];
  value: T | null;
  onValueChange: (value: T) => void;
  onCreateNew?: (inputValue: string) => T | Promise<T>;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  getLabel?: (option: T) => string;
  filterFn?: (option: T, search: string) => boolean;
  /** ID of a suggested option to highlight (e.g., last used budget for a payee) */
  suggestedId?: string;
}

function ComboboxInner<T extends ComboboxOption>(
  {
    options,
    groups,
    value,
    onValueChange,
    onCreateNew,
    placeholder = "Select...",
    emptyText = "No results found.",
    className,
    getLabel = (option) => option.label,
    filterFn,
    suggestedId,
    ...inputProps
  }: ComboboxProps<T>,
  ref: React.ForwardedRef<HTMLInputElement>
) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [selectedValue, setSelectedValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const shouldIgnoreBlur = React.useRef(false);

  // Sync the ref
  React.useImperativeHandle(ref, () => inputRef.current!);

  // Flatten groups into a single options array for compatibility
  const allOptions = React.useMemo(() => {
    if (options) return options;
    if (groups) return groups.flatMap((g) => g.options);
    return [];
  }, [options, groups]);

  // Default filter function
  const defaultFilterFn = React.useCallback(
    (option: T, search: string) => {
      return getLabel(option).toLowerCase().includes(search.toLowerCase());
    },
    [getLabel]
  );

  // Filter options based on search, with suggested option first
  const filteredOptions = React.useMemo(() => {
    const filter = filterFn || defaultFilterFn;
    const baseOptions = !search
      ? allOptions
      : allOptions.filter((option) => filter(option, search.toLowerCase()));

    // Sort suggested option to the front for keyboard navigation
    if (suggestedId) {
      const suggestedIndex = baseOptions.findIndex((opt) => opt.id === suggestedId);
      if (suggestedIndex > 0) {
        const suggested = baseOptions[suggestedIndex];
        return [
          suggested,
          ...baseOptions.slice(0, suggestedIndex),
          ...baseOptions.slice(suggestedIndex + 1),
        ];
      }
    }
    return baseOptions;
  }, [allOptions, search, filterFn, defaultFilterFn, suggestedId]);

  // Find the suggested option for rendering
  const suggestedOption = React.useMemo(() => {
    if (!suggestedId) return null;
    return filteredOptions.find((opt) => opt.id === suggestedId) || null;
  }, [filteredOptions, suggestedId]);

  // Filter groups based on search, excluding the suggested option (shown separately)
  const filteredGroups = React.useMemo(() => {
    if (!groups) return null;
    const filter = filterFn || defaultFilterFn;
    const baseGroups = !search
      ? groups
      : groups
          .map((group) => ({
            ...group,
            options: group.options.filter((option) => filter(option, search.toLowerCase())),
          }))
          .filter((group) => group.options.length > 0);

    // If we have a suggested option, remove it from its original group (it will be shown at the top)
    if (suggestedId) {
      return baseGroups
        .map((group) => ({
          ...group,
          options: group.options.filter((opt) => opt.id !== suggestedId),
        }))
        .filter((group) => group.options.length > 0);
    }
    return baseGroups;
  }, [groups, search, filterFn, defaultFilterFn, suggestedId]);

  // Check if we should show the "Create" option
  const showCreateOption = React.useMemo(() => {
    if (!onCreateNew || !search.trim()) return false;
    const exactMatch = allOptions.find(
      (opt) => getLabel(opt).toLowerCase() === search.toLowerCase()
    );
    return !exactMatch;
  }, [allOptions, search, onCreateNew, getLabel]);

  // Handle option selection
  const handleSelect = (option: T) => {
    onValueChange(option);
    setSearch(getLabel(option));
    setSelectedValue(option.id);
    setOpen(false);
    // Keep focus on input so user can tab to next field
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  // Handle creating a new option
  const handleCreate = async () => {
    if (!onCreateNew) return;
    const newOption = await onCreateNew(search.trim());
    handleSelect(newOption);
  };

  // Track previous open state to detect when popover opens
  const wasOpenRef = React.useRef(false);
  // Track previous search to detect filter changes
  const prevSearchRef = React.useRef(search);
  // Track previous suggestedId to detect when it changes
  const prevSuggestedIdRef = React.useRef(suggestedId);
  // Track if user has manually navigated (arrow keys)
  const hasManuallyNavigatedRef = React.useRef(false);

  // Reset manual navigation flag when popover closes
  React.useEffect(() => {
    if (!open) {
      hasManuallyNavigatedRef.current = false;
    }
  }, [open]);

  // Update search when value changes externally (only when closed)
  React.useEffect(() => {
    if (value && !open) {
      setSearch(getLabel(value));
    }
  }, [value, open, getLabel]);

  // Set default selection when popover opens, search changes, or suggestedId changes
  React.useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    const searchChanged = search !== prevSearchRef.current;
    const suggestedIdChanged = suggestedId !== prevSuggestedIdRef.current;

    wasOpenRef.current = open;
    prevSearchRef.current = search;
    prevSuggestedIdRef.current = suggestedId;

    // Clear selection when popover closes and no value
    if (!open && !value) {
      setSelectedValue("");
      return;
    }

    // Don't update selection if user has manually navigated with arrow keys
    if (hasManuallyNavigatedRef.current) {
      return;
    }

    // Update selection when: popover opens, search changes, or suggestedId changes
    const shouldUpdateSelection =
      open && filteredOptions.length > 0 && (justOpened || searchChanged || suggestedIdChanged);

    if (shouldUpdateSelection) {
      // When opening, if current value is in filtered options, keep it selected
      if (value && filteredOptions.find((opt) => opt.id === value.id)) {
        setSelectedValue(value.id);
      } else if (suggestedId && filteredOptions.find((opt) => opt.id === suggestedId)) {
        // If there's a suggested option, select it
        setSelectedValue(suggestedId);
      } else {
        // Otherwise, default to first filtered option
        setSelectedValue(filteredOptions[0].id);
      }
    }
  }, [open, search, filteredOptions, value, suggestedId]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    // When open, handle navigation
    if (e.key === "ArrowDown") {
      e.preventDefault();
      hasManuallyNavigatedRef.current = true;
      // Move to next item
      const currentIndex = filteredOptions.findIndex((opt) => opt.id === selectedValue);
      const nextIndex = currentIndex + 1;
      if (nextIndex < filteredOptions.length) {
        setSelectedValue(filteredOptions[nextIndex].id);
      } else if (showCreateOption && currentIndex === -1) {
        setSelectedValue(filteredOptions[0]?.id || "");
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      hasManuallyNavigatedRef.current = true;
      // Move to previous item
      const currentIndex = filteredOptions.findIndex((opt) => opt.id === selectedValue);
      if (currentIndex > 0) {
        setSelectedValue(filteredOptions[currentIndex - 1].id);
      } else if (showCreateOption && currentIndex === 0) {
        setSelectedValue("__create__");
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Select current highlighted item
      if (selectedValue === "__create__") {
        handleCreate();
      } else {
        const selected = filteredOptions.find((opt) => opt.id === selectedValue);
        if (selected) {
          handleSelect(selected);
        }
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setSearch(value ? getLabel(value) : "");
          }}
          onBlur={() => {
            // Don't close if clicking inside the popover
            if (shouldIgnoreBlur.current) {
              shouldIgnoreBlur.current = false;
              return;
            }

            // Delay to allow click events in the popover to fire
            setTimeout(() => {
              setOpen(false);
              // Reset to selected value if still valid
              if (value) {
                setSearch(getLabel(value));
              }
            }, 200);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-9 w-full rounded-md border border-input bg-white px-3 py-1",
            "text-sm shadow-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          placeholder={placeholder}
          {...inputProps}
        />
      </PopoverAnchor>
      <PopoverContent
        className="p-0"
        align="start"
        side="bottom"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // Prevent closing when clicking the input
          if (e.target === inputRef.current) {
            e.preventDefault();
          }
        }}
        style={{
          width: inputRef.current?.offsetWidth || "auto",
        }}
      >
        <Command shouldFilter={false} value={selectedValue} onValueChange={setSelectedValue}>
          <CommandList>
            {showCreateOption && (
              <>
                <CommandGroup>
                  <CommandItem
                    value="__create__"
                    onSelect={handleCreate}
                    className="text-primary aria-selected:text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create &quot;{search}&quot;
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            {filteredGroups ? (
              // Render grouped options
              <>
                {filteredGroups.length === 0 && !suggestedOption && !showCreateOption && (
                  <CommandEmpty>{emptyText}</CommandEmpty>
                )}
                {/* Show suggested option at the top */}
                {suggestedOption && (
                  <>
                    <CommandGroup heading="Suggested">
                      <CommandItem
                        key={suggestedOption.id}
                        value={suggestedOption.id}
                        onSelect={() => handleSelect(suggestedOption)}
                        className="bg-amber-50"
                      >
                        {suggestedOption.icon}
                        {getLabel(suggestedOption)}
                        <Star className="ml-auto h-3 w-3 text-amber-500 fill-amber-500" />
                      </CommandItem>
                    </CommandGroup>
                    {filteredGroups.length > 0 && <CommandSeparator />}
                  </>
                )}
                {filteredGroups.map((group, idx) => (
                  <React.Fragment key={group.label}>
                    <CommandGroup heading={group.label}>
                      {group.options.map((option) => (
                        <CommandItem
                          key={option.id}
                          value={option.id}
                          onSelect={() => handleSelect(option)}
                        >
                          {option.icon}
                          {getLabel(option)}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    {idx < filteredGroups.length - 1 && <CommandSeparator />}
                  </React.Fragment>
                ))}
              </>
            ) : (
              // Render flat options
              <CommandGroup>
                {filteredOptions.length === 0 && !showCreateOption && (
                  <CommandEmpty>{emptyText}</CommandEmpty>
                )}
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    onSelect={() => handleSelect(option)}
                    className={cn(suggestedId === option.id && "bg-amber-50")}
                  >
                    {option.icon}
                    {getLabel(option)}
                    {suggestedId === option.id && (
                      <span className="ml-auto text-xs text-amber-600">suggested</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export const Combobox = React.forwardRef(ComboboxInner) as <T extends ComboboxOption>(
  props: ComboboxProps<T> & { ref?: React.ForwardedRef<HTMLInputElement> }
) => ReturnType<typeof ComboboxInner>;

(Combobox as any).displayName = "Combobox";
