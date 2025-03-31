import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { cn } from "@/lib/utils";
import type { Components } from "react-markdown";
import { Button } from "./ui/button";
import { Check, Copy } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface AnimatedMessageContentProps {
  content: string;
  isStreaming?: boolean;
  typingSpeed?: number;
}

const components: Components = {
  pre: ({ children }) => <div className='not-prose my-4'>{children}</div>,
  code(props) {
    const { className, children } = props;
    const match = /language-(\w+)/.exec(className || "");
    let lang = match ? match[1].toLowerCase() : "text";

    // Detect PHP code by checking for <?php
    const code = String(children).replace(/\n$/, "");
    if (code.includes("<?php") || code.includes("<?=")) {
      lang = "php";
    }

    // Map common language aliases
    const languageMap: { [key: string]: string } = {
      js: "javascript",
      ts: "typescript",
      py: "python",
      rb: "ruby",
      md: "markdown",
      sh: "bash",
      yml: "yaml",
      tex: "latex",
    };

    // Use mapped language if available
    lang = languageMap[lang] || lang;

    if (!className || !match) {
      return (
        <code
          className={cn(
            "bg-muted/50 px-1.5 py-0.5 rounded-md font-mono text-sm",
            className
          )}
          {...props}
        >
          {children}
        </code>
      );
    }

    const [copied, setCopied] = useState(false);

    return (
      <div className='relative group rounded-md overflow-hidden max-w-full'>
        <div className='absolute right-4 top-3 z-10'>
          <button
            onClick={() => {
              navigator.clipboard.writeText(code);
              setCopied(true);
              toast({
                description: "Code copied to clipboard",
                duration: 2000,
              });
              setTimeout(() => setCopied(false), 2000);
            }}
            className='flex h-7 items-center gap-1.5 rounded-md bg-black/30 px-3 text-xs text-zinc-400 hover:bg-black/50 hover:text-zinc-100 transition-colors'
          >
            {copied ? (
              <>
                <Check className='h-3.5 w-3.5' />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className='h-3.5 w-3.5' />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <div className='max-w-full overflow-x-auto'>
          <SyntaxHighlighter
            language={lang}
            style={oneDark}
            customStyle={{
              margin: 0,
              padding: "1rem",
              background: "rgb(40, 40, 40)",
              fontSize: "13px",
              lineHeight: "1.6",
              width: "100%",
              minWidth: "100%",
            }}
            wrapLines={true}
            wrapLongLines={true}
            showLineNumbers={true}
            className='syntax-highlighter'
          >
            {code}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  },
  p: ({ children }) => {
    return <p className='leading-7 [&:not(:first-child)]:mt-4'>{children}</p>;
  },
  ul: ({ children }) => {
    return <ul className='my-4 ml-6 list-disc [&>li]:mt-2'>{children}</ul>;
  },
  ol: ({ children }) => {
    return <ol className='my-4 ml-6 list-decimal [&>li]:mt-2'>{children}</ol>;
  },
  li: ({ children }) => {
    return <li className='marker:text-muted-foreground'>{children}</li>;
  },
  blockquote: ({ children }) => {
    return (
      <blockquote className='mt-4 border-l-2 pl-4 italic text-muted-foreground'>
        {children}
      </blockquote>
    );
  },
};

export function AnimatedMessageContent({
  content,
  isStreaming = false,
  typingSpeed = 8,
}: AnimatedMessageContentProps) {
  const [displayedContent, setDisplayedContent] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const contentRef = useRef(content);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [copyStates, setCopyStates] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!content) return;
    contentRef.current = content;

    if (!isStreaming) {
      // For non-streaming content, show immediately without animation
      setDisplayedContent(content);
      setIsVisible(true);
      return;
    }

    // For streaming content, implement smooth character-by-character animation
    let currentLength = displayedContent.length;
    const targetLength = content.length;

    if (currentLength < targetLength) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Schedule next character addition
      timeoutRef.current = setTimeout(() => {
        // Add more characters at once for faster animation
        const charsToAdd = 6; // Increased from 3 to 6
        const nextChars = content.substring(
          currentLength,
          currentLength + charsToAdd
        );
        const lastChar = nextChars[nextChars.length - 1];
        const isEndOfSentence = [".", "!", "?"].includes(lastChar);
        const isComma = lastChar === ",";

        setDisplayedContent(content.substring(0, currentLength + charsToAdd));

        // Shorter pauses for punctuation
        if (isEndOfSentence) {
          timeoutRef.current = setTimeout(() => {}, typingSpeed * 1.5);
        } else if (isComma) {
          timeoutRef.current = setTimeout(() => {}, typingSpeed * 1.1);
        }
      }, typingSpeed);
    }

    setIsVisible(true);

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, isStreaming, typingSpeed, displayedContent]);

  const handleCopy = async (code: string, index: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyStates((prev) => ({ ...prev, [index]: true }));
      setTimeout(() => {
        setCopyStates((prev) => ({ ...prev, [index]: false }));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        isStreaming ? "transition-all duration-50" : "",
        isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      <ReactMarkdown components={components}>{displayedContent}</ReactMarkdown>
    </div>
  );
}
