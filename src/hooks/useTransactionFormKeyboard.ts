import * as React from "react";

interface UseTransactionFormKeyboardOptions {
  /** Callback to call when form is saved (Enter or Check button) - only called if validation passes */
  onSave: () => void;
  /** Callback to call when form is cancelled (Escape or X button) */
  onCancel: () => void;
  /**
   * Validation function that checks if all required fields are filled.
   * Should return the first empty field's ref/element to focus, or null if all fields are valid.
   */
  validate: () => HTMLElement | null;
}

interface UseTransactionFormKeyboardResult {
  /** Handler for keyboard events (Escape to cancel, Enter to save) */
  handleKeyDown: (e: React.KeyboardEvent) => void;
  /** Handler to cancel (discard draft) */
  handleCancel: () => void;
  /** Handler to validate and save (copy draft to original) */
  handleSave: () => void;
}

/**
 * Hook for handling keyboard interactions in transaction form rows.
 * Provides Escape to cancel (discard draft) and Enter to save (with validation).
 *
 * Note: This hook works with the draft pattern - the parent component is responsible
 * for creating drafts and copying them back to originals on save.
 */
export function useTransactionFormKeyboard(
  options: UseTransactionFormKeyboardOptions
): UseTransactionFormKeyboardResult {
  const { onSave, onCancel, validate } = options;

  // Cancel: just call onCancel (parent handles draft discard)
  const handleCancel = React.useCallback(() => {
    onCancel();
  }, [onCancel]);

  // Save: validate first, then call onSave if valid
  const handleSave = React.useCallback(() => {
    const invalidField = validate();
    if (invalidField) {
      invalidField.focus();
      return;
    }

    // All required fields are filled, save
    onSave();
  }, [validate, onSave]);

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
