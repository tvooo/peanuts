import { Plus } from "lucide-react";
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

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    const filter = filterFn || defaultFilterFn;
    return !search
      ? allOptions
      : allOptions.filter((option) => filter(option, search.toLowerCase()));
  }, [allOptions, search, filterFn, defaultFilterFn]);

  // Filter groups based on search
  const filteredGroups = React.useMemo(() => {
    if (!groups) return null;
    const filter = filterFn || defaultFilterFn;
    return !search
      ? groups
      : groups
          .map((group) => ({
            ...group,
            options: group.options.filter((option) => filter(option, search.toLowerCase())),
          }))
          .filter((group) => group.options.length > 0);
  }, [groups, search, filterFn, defaultFilterFn]);

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
    if (open) return;
    // No value (e.g. the selection was cleared): fall back to the placeholder
    setSearch(value ? getLabel(value) : "");
  }, [value, open, getLabel]);

  // Set default selection when popover opens or search changes
  React.useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    const searchChanged = search !== prevSearchRef.current;

    wasOpenRef.current = open;
    prevSearchRef.current = search;

    // Clear selection when popover closes and no value
    if (!open && !value) {
      setSelectedValue("");
      return;
    }

    // Typing resumes automatic selection after manual arrow-key navigation
    if (searchChanged) {
      hasManuallyNavigatedRef.current = false;
    }
    if (hasManuallyNavigatedRef.current) {
      return;
    }

    // Update selection when: popover opens or search changes
    if (open && (justOpened || searchChanged)) {
      // When opening, if current value is in filtered options, keep it selected
      if (value && filteredOptions.find((opt) => opt.id === value.id)) {
        setSelectedValue(value.id);
      } else if (filteredOptions.length > 0) {
        setSelectedValue(filteredOptions[0].id);
      } else if (showCreateOption) {
        // Nothing matches: highlight "Create" so Enter creates the entry
        setSelectedValue("__create__");
      } else {
        setSelectedValue("");
      }
    }
  }, [open, search, filteredOptions, value, showCreateOption]);

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

    // When open, handle navigation. The "Create" option renders above the
    // list and takes part in it.
    const navigationIds = showCreateOption
      ? ["__create__", ...filteredOptions.map((opt) => opt.id)]
      : filteredOptions.map((opt) => opt.id);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      hasManuallyNavigatedRef.current = true;
      const currentIndex = navigationIds.indexOf(selectedValue);
      if (currentIndex < navigationIds.length - 1) {
        setSelectedValue(navigationIds[currentIndex + 1]);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      hasManuallyNavigatedRef.current = true;
      const currentIndex = navigationIds.indexOf(selectedValue);
      if (currentIndex > 0) {
        setSelectedValue(navigationIds[currentIndex - 1]);
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
        } else {
          // Nothing selected - just close the dropdown
          setOpen(false);
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
        // Inside a modal dialog, react-remove-scroll cancels wheel/touch
        // events on the portaled popover; keep them so the list can scroll
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
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
                {filteredGroups.length === 0 && !showCreateOption && (
                  <CommandEmpty>{emptyText}</CommandEmpty>
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
                  >
                    {option.icon}
                    {getLabel(option)}
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
