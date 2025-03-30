import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import type { Components } from "react-markdown";
import { Button } from "./ui/button";
import { Check, Copy } from "lucide-react";

interface AnimatedMessageContentProps {
  content: string;
  isStreaming?: boolean;
  typingSpeed?: number;
}

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

  const components: Components = {
    code: ({ node, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || "");
      const isCodeBlock = match && children && typeof children === "string";
      const codeId = `${children}-${Math.random()}`;

      if (!isCodeBlock) {
        return (
          <code
            className={cn("bg-muted/50 rounded-sm px-1 py-0.5", className)}
            {...props}
          >
            {children}
          </code>
        );
      }

      return (
        <div className='relative group'>
          <div className='absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity'>
            <Button
              variant='ghost'
              size='icon'
              className='h-8 w-8 bg-muted/50 hover:bg-muted'
              onClick={() =>
                handleCopy(String(children).replace(/\n$/, ""), codeId)
              }
            >
              {copyStates[codeId] ? (
                <Check className='h-4 w-4 text-green-500' />
              ) : (
                <Copy className='h-4 w-4' />
              )}
            </Button>
          </div>
          <div className='rounded-lg overflow-hidden border border-gray-700'>
            <div className='bg-gray-900 px-4 py-2 text-xs text-gray-400 flex justify-between items-center'>
              <span>{match[1]}</span>
            </div>
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={match[1]}
              PreTag='div'
              customStyle={{
                margin: 0,
                background: "#1a1a1a",
                padding: "1rem",
              }}
            >
              {String(children).replace(/\n$/, "")}
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
