import { addDays, isSameMonth, startOfMonth } from "date-fns";
import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatGermanDate, parseGermanDate } from "@/utils/dateUtils";

interface DatePickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: Date | null;
  onChange: (date: Date | null) => void;
}

function DatePickerInner(
  { value, onChange, className, disabled, ...inputProps }: DatePickerProps,
  ref: React.ForwardedRef<HTMLInputElement>
) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [month, setMonth] = React.useState<Date>(new Date());
  const [isTextMode, setIsTextMode] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement>(null);

  // Forward the ref
  React.useImperativeHandle(ref, () => inputRef.current!);

  // Sync input value with prop value
  React.useEffect(() => {
    if (value) {
      setInputValue(formatGermanDate(value));
      setSelectedDate(value);
      setMonth(startOfMonth(value));
    } else {
      setInputValue("");
      setSelectedDate(null);
    }
  }, [value]);

  // Handle calendar selection
  const handleCalendarSelect = React.useCallback(
    (date: Date | undefined) => {
      if (date) {
        setSelectedDate(date);
        setInputValue(formatGermanDate(date));
        onChange(date);
        setOpen(false);
        setIsTextMode(false);
      }
    },
    [onChange]
  );

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Open with arrows when closed
      if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        setOpen(true);
        return;
      }

      // Clear with backspace (first press)
      if (e.key === "Backspace" && inputValue && !isTextMode) {
        e.preventDefault();
        setInputValue("");
        setSelectedDate(null);
        setIsTextMode(true);
        setOpen(false);
        onChange(null);
        return;
      }

      // Navigate calendar with arrows
      if (open && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation(); // Don't let form row see this

        const current = selectedDate || new Date();
        let newDate: Date;

        switch (e.key) {
          case "ArrowLeft":
            newDate = addDays(current, -1);
            break;
          case "ArrowRight":
            newDate = addDays(current, 1);
            break;
          case "ArrowUp":
            newDate = addDays(current, -7);
            break;
          case "ArrowDown":
            newDate = addDays(current, 7);
            break;
          default:
            return;
        }

        setSelectedDate(newDate);
        setInputValue(formatGermanDate(newDate));
        onChange(newDate);

        // Update month if crossed boundary
        if (!isSameMonth(newDate, month)) {
          setMonth(startOfMonth(newDate));
        }
        return;
      }

      // Close on Enter (let form row handle validation)
      if (e.key === "Enter" && open) {
        setOpen(false);
        // Don't preventDefault - form needs this
        return;
      }

      // Tab closes (validation in blur handler)
      if (e.key === "Tab") {
        setOpen(false);
        // Don't preventDefault - normal tab flow
      }

      // Escape NOT handled - bubbles to form row
    },
    [open, inputValue, isTextMode, selectedDate, month, onChange]
  );

  // Handle input change (text entry)
  const handleInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      setIsTextMode(true);

      // Try to parse as we type (for immediate calendar feedback)
      const parsed = parseGermanDate(newValue);
      if (parsed) {
        setSelectedDate(parsed);
        if (!isSameMonth(parsed, month)) {
          setMonth(startOfMonth(parsed));
        }
      }

      // Open popover if closed
      if (!open) {
        setOpen(true);
      }
    },
    [open, month]
  );

  // Handle blur with validation
  const handleBlur = React.useCallback(() => {
    setTimeout(() => {
      setOpen(false);

      if (isTextMode) {
        const parsed = parseGermanDate(inputValue);
        if (parsed) {
          // Valid date
          onChange(parsed);
          setSelectedDate(parsed);
          setIsTextMode(false);
        } else {
          // Invalid - restore previous
          if (value) {
            setInputValue(formatGermanDate(value));
            setSelectedDate(value);
          } else {
            setInputValue("");
            setSelectedDate(null);
          }
          setIsTextMode(false);
        }
      }
    }, 200); // Delay for click events
  }, [isTextMode, inputValue, value, onChange]);

  // Handle focus
  const handleFocus = React.useCallback(() => {
    setOpen(true);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={handleFocus}
          disabled={disabled}
          placeholder="dd.MM.yyyy"
          className={cn(
            "h-9 w-full rounded-md border border-input bg-white px-3 py-1",
            "text-sm shadow-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...inputProps}
        />
      </PopoverAnchor>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        side="bottom"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // Don't close if clicking the input itself
          if (e.target === inputRef.current) {
            e.preventDefault();
          }
        }}
      >
        <Calendar
          mode="single"
          selected={selectedDate || undefined}
          onSelect={handleCalendarSelect}
          month={month}
          onMonthChange={setMonth}
        />
      </PopoverContent>
    </Popover>
  );
}

export const DatePicker = React.forwardRef(DatePickerInner);
DatePicker.displayName = "DatePicker";
