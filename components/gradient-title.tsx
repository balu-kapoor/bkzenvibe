import { cn } from "@/lib/utils";

interface GradientTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function GradientTitle({ children, className }: GradientTitleProps) {
  return (
    <h1
      className={cn(
        "text-5xl font-bold tracking-tight bg-clip-text text-transparent",
        "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500",
        "animate-gradient bg-300% dark:from-blue-400 dark:via-purple-400 dark:to-pink-400",
        "transition-all duration-300 hover:opacity-80",
        className
      )}
      style={{
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
    >
      {children}
    </h1>
  );
}
