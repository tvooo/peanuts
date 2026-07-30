/**
 * Shared content widths. Backgrounds, borders and dividers span the full
 * viewport; only the content inside them is constrained, so the nav bar lines
 * up with the page content below it.
 *
 * `containerClass` is the wide track used by the table-heavy pages (and the nav
 * bar); `narrowContainerClass` is for reading-oriented pages like the dashboard
 * and reports, which look better without the extra width.
 */
export const containerClass = "mx-auto w-full max-w-7xl px-6";
export const narrowContainerClass = "mx-auto w-full max-w-5xl px-6";

/** White surface the tables and list pages sit on, against the grey page background. */
export const surfaceClass = "rounded-xl border border-border bg-card shadow-sm";
