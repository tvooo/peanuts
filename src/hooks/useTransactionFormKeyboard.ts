import { runInAction } from "mobx";
import * as React from "react";

interface UseTransactionFormKeyboardOptions<T> {
  /** Callback to call when form is closed (either saved or cancelled) */
  onDone: () => void;
  /** Function that returns a snapshot of the current form state */
  getSnapshot: () => T;
  /** Function that restores the form state from a snapshot */
  restoreSnapshot: (snapshot: T) => void;
  /**
   * Validation function that checks if all required fields are filled.
   * Should return the first empty field's ref/element to focus, or null if all fields are valid.
   */
  validate: () => HTMLElement | null;
}

interface UseTransactionFormKeyboardResult {
  /** Handler for keyboard events (Escape to cancel, Enter to save) */
  handleKeyDown: (e: React.KeyboardEvent) => void;
  /** Handler to cancel and restore original values */
  handleCancel: () => void;
  /** Handler to validate and save */
  handleSave: () => void;
}

/**
 * Hook for handling keyboard interactions in transaction form rows.
 * Provides Escape to cancel (restore original data) and Enter to save (with validation).
 */
export function useTransactionFormKeyboard<T>(
  options: UseTransactionFormKeyboardOptions<T>
): UseTransactionFormKeyboardResult {
  const { onDone, getSnapshot, restoreSnapshot, validate } = options;

  // Store original values for reset on Escape
  const originalSnapshot = React.useRef<T | null>(null);

  // Initialize snapshot on mount
  React.useEffect(() => {
    if (!originalSnapshot.current) {
      originalSnapshot.current = getSnapshot();
    }
  }, [getSnapshot]);

  // Restore original values and close form
  const handleCancel = React.useCallback(() => {
    if (originalSnapshot.current) {
      runInAction(() => {
        restoreSnapshot(originalSnapshot.current!);
      });
    }
    onDone();
  }, [restoreSnapshot, onDone]);

  // Validate required fields and either save or focus next empty field
  const handleSave = React.useCallback(() => {
    const invalidField = validate();
    if (invalidField) {
      invalidField.focus();
      return;
    }

    // All required fields are filled, save
    onDone();
  }, [validate, onDone]);

  // Handle keyboard events
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    },
    [handleCancel, handleSave]
  );

  return {
    handleKeyDown,
    handleCancel,
    handleSave,
  };
}
