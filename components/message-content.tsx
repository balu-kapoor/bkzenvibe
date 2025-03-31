import { useState, useEffect } from "react";
import ReactMarkdown, { type CodeProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import * as shiki from "shiki";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import type { Components } from "react-markdown";
import type { CSSProperties } from "react";
import { toast } from "@/components/ui/use-toast";

interface MessageContentProps {
  content: string;
  isStreaming?: boolean;
}

// Initialize shiki highlighter
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

const MarkdownComponents: Components = {
  p: ({ children }) => (
    <p className='mb-4 last:mb-0 leading-relaxed text-sm sm:text-base'>
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className='mb-4 list-disc pl-4 sm:pl-6 space-y-2'>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className='mb-4 list-decimal pl-4 sm:pl-6 space-y-2'>{children}</ol>
  ),
  li: ({ children }) => (
    <li className='text-sm sm:text-base leading-relaxed'>{children}</li>
  ),
  h1: ({ children }) => (
    <h1 className='text-2xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent'>
      {children}
    </h1>
  ),
  h2: ({ children }) => <h2 className='text-xl font-bold mb-3'>{children}</h2>,
  h3: ({ children }) => <h3 className='text-lg font-bold mb-2'>{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className='border-l-4 border-primary/20 pl-4 italic my-4 bg-muted/30 rounded-r-lg py-2 text-sm sm:text-base'>
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className='overflow-x-auto my-4 rounded-lg border border-border'>
      <table className='min-w-full divide-y divide-border'>{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className='px-4 py-2 text-left font-semibold bg-muted/50'>
      {children}
    </th>
  ),
  td: ({ children }) => <td className='px-4 py-2 border-t'>{children}</td>,
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
};

export function MessageContent({
  content,
  isStreaming = false,
}: MessageContentProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [highlighter, setHighlighter] = useState<shiki.Highlighter | null>(
    null
  );

  useEffect(() => {
    getShikiHighlighter().then(setHighlighter);
  }, []);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayText(content);
      setIsComplete(true);
      return;
    }

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < content.length) {
        const charsToAdd = Math.min(
          Math.floor(Math.random() * 3) + 1,
          content.length - currentIndex
        );
        setDisplayText(content.slice(0, currentIndex + charsToAdd));
        currentIndex += charsToAdd;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [content, isStreaming]);

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard",
    });
  };

  return (
    <div
      className={cn(
        "transition-all duration-200 w-full overflow-hidden px-4",
        isStreaming && !isComplete && "opacity-90"
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        className='prose prose-sm dark:prose-invert max-w-none break-words'
        components={{
          ...MarkdownComponents,
        }}
      >
        {displayText}
      </ReactMarkdown>
    </div>
  );
}
