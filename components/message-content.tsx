import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import type { Components } from "react-markdown";
import type { CSSProperties } from "react";
import { toast } from "@/components/ui/use-toast";

interface MessageContentProps {
  content: string;
  isStreaming?: boolean;
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

    if (!className && !match && lang === "text") {
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
};

export function MessageContent({
  content,
  isStreaming = false,
}: MessageContentProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

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
