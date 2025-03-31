import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as shiki from "shiki";
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

let highlighterPromise: Promise<shiki.Highlighter> | null = null;

async function getShikiHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = shiki.createHighlighter({
      themes: ["github-dark"],
      langs: [
        "javascript",
        "typescript",
        "jsx",
        "tsx",
        "json",
        "bash",
        "markdown",
        "python",
        "css",
        "html",
        "yaml",
        "sql",
      ],
    });
  }
  return highlighterPromise;
}

const components: Components = {
  pre: ({ children }) => <div className='not-prose my-4'>{children}</div>,
  code(props) {
    const { className, children } = props;
    const match = /language-(\w+)/.exec(className || "");
    const lang = match ? match[1] : "text";

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

    const code = String(children).replace(/\n$/, "");
    const [copied, setCopied] = useState(false);
    const [highlighted, setHighlighted] = useState<string>("");

    useEffect(() => {
      getShikiHighlighter().then(async (highlighter) => {
        try {
          const html = await highlighter.codeToHtml(code, {
            lang,
            theme: "github-dark",
            transformers: [
              {
                pre(node) {
                  node.properties.style =
                    "background-color: rgb(40, 40, 40); border-radius: 6px; margin: 0;";
                  return node;
                },
                code(node) {
                  node.properties.style =
                    "display: grid; padding: 16px; white-space: pre-wrap; word-wrap: break-word;";
                  return node;
                },
                line(node) {
                  node.properties.style = "line-height: 1.6;";
                  return node;
                },
              },
            ],
          });
          setHighlighted(html);
        } catch (error) {
          console.error("Failed to highlight code:", error);
          setHighlighted(code);
        }
      });
    }, [code, lang]);

    return (
      <div className='relative group rounded-md overflow-hidden'>
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
        <div
          className='font-mono text-[13px] leading-relaxed bg-[rgb(40,40,40)]'
          dangerouslySetInnerHTML={{ __html: highlighted || code }}
        />
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
  const [highlighter, setHighlighter] = useState<shiki.Highlighter | null>(
    null
  );

  useEffect(() => {
    getShikiHighlighter().then(setHighlighter);
  }, []);

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
