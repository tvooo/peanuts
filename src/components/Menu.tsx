import { twJoin } from "tailwind-merge";

interface MenuItemProps extends React.ComponentProps<"button"> {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  badge?: React.ReactNode;
}

export function MenuItem({ children, onClick, icon, isActive, badge = null }: MenuItemProps) {
  return (
    <button
      type="button"
      className={twJoin(
        "mb-0.5 transition-color flex items-center gap-2 px-2 py-1 hover:bg-stone-200 rounded-md w-full",
        isActive && "bg-stone-200 font-semibold"
      )}
      onClick={onClick}
      aria-pressed={isActive}
    >
      {icon}
      <div>{children}</div>
      {badge}
    </button>
  );
}
