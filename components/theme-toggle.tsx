"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // After mounting, we have access to the theme
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className='fixed top-4 right-14 z-50'>
      <Button
        variant='ghost'
        size='icon'
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className='rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700'
      >
        {theme === "dark" ? (
          <Sun className='h-5 w-5 text-gray-600 dark:text-gray-300' />
        ) : (
          <Moon className='h-5 w-5 text-gray-600 dark:text-gray-300' />
        )}
        <span className='sr-only'>Toggle theme</span>
      </Button>
    </div>
  );
}
