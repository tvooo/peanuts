import * as React from "react";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface ComboboxOption {
  id: string;
  label: string;
}

interface ComboboxProps<T extends ComboboxOption> {
  options: T[];
  value: T | null;
  onValueChange: (value: T) => void;
  onCreateNew?: (inputValue: string) => T | Promise<T>;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  getLabel?: (option: T) => string;
  filterFn?: (option: T, search: string) => boolean;
}

export const Combobox = React.forwardRef<
  HTMLInputElement,
  ComboboxProps<ComboboxOption>
>(
  (
    {
      options,
      value,
      onValueChange,
      onCreateNew,
      placeholder = "Select...",
      emptyText = "No results found.",
      className,
      getLabel = (option) => option.label,
      filterFn,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const [selectedValue, setSelectedValue] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);
    const shouldIgnoreBlur = React.useRef(false);

    // Sync the ref
    React.useImperativeHandle(ref, () => inputRef.current!);

    // Default filter function
    const defaultFilterFn = (option: ComboboxOption, search: string) => {
      return getLabel(option).toLowerCase().includes(search.toLowerCase());
    };

    // Filter options based on search
    const filteredOptions = React.useMemo(() => {
      if (!search) return options;
      const searchLower = search.toLowerCase();
      const filter = filterFn || defaultFilterFn;
      return options.filter((option) => filter(option, searchLower));
    }, [options, search, filterFn]);

    // Check if we should show the "Create" option
    const showCreateOption = React.useMemo(() => {
      if (!onCreateNew || !search.trim()) return false;
      const exactMatch = options.find(
        (opt) => getLabel(opt).toLowerCase() === search.toLowerCase()
      );
      return !exactMatch;
    }, [options, search, onCreateNew, getLabel]);

    // Handle option selection
    const handleSelect = (option: ComboboxOption) => {
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

    // Update search and selected value when value changes externally
    React.useEffect(() => {
      if (value) {
        if (!open) {
          setSearch(getLabel(value));
        }
        setSelectedValue(value.id);
      } else if (!open) {
        // Only clear selection when closed
        setSelectedValue("");
      }
    }, [value, open, getLabel]);

    // Set default selection when popover opens
    React.useEffect(() => {
      if (open && filteredOptions.length > 0) {
        // When opening, if current value is in filtered options, keep it selected
        if (value && filteredOptions.find(opt => opt.id === value.id)) {
          setSelectedValue(value.id);
        } else {
          // Otherwise, default to first filtered option
          setSelectedValue(filteredOptions[0].id);
        }
      }
    }, [open]);

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
            onBlur={(e) => {
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
                    {getLabel(option)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }
);

Combobox.displayName = "Combobox";
