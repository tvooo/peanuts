import { twMerge } from "tailwind-merge";

interface ButtonProps extends React.ComponentProps<"button"> {}

export function Button({ className, ...props }: ButtonProps) {
  return (
    <button
      className={twMerge(
        "flex items-center justify-center px-2 py-1 border-b-[1px] border-stone-200 bg-stone-100 rounded-md transition-colors hover:bg-stone-200 hover:border-stone-300"
      )}
      {...props}
    />
  );
}
