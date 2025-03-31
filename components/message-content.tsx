import { useState, useEffect, useRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import type { Components } from "react-markdown";
import type { CSSProperties } from "react";
import { toast } from "@/components/ui/use-toast";
import * as React from "react";

interface MessageContentProps {
  content: string;
  isStreaming?: boolean;
}

const HighlightedCode = React.memo(function HighlightedCode({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  return (
    <SyntaxHighlighter
      language={language}
      style={oneDark}
      customStyle={{
        margin: 0,
        padding: "1rem",
        background: "rgb(40, 40, 40)",
        fontSize: "13px",
        lineHeight: "1.6",
        width: "100%",
        minWidth: "100%",
        textAlign: "left",
      }}
      wrapLines={false}
      wrapLongLines={false}
      showLineNumbers={true}
      className='syntax-highlighter'
    >
      {code}
    </SyntaxHighlighter>
  );
});

const CodeBlock = React.memo(function CodeBlock({
  code,
  lang,
  className,
}: {
  code: string;
  lang: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!className && lang === "text") {
    return (
      <code
        className={cn(
          "bg-muted/50 px-1.5 py-0.5 rounded-md font-mono text-sm text-left",
          className
        )}
      >
        {code}
      </code>
    );
  }

  return (
    <div className='relative group rounded-md overflow-hidden max-w-full text-left'>
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
      <div className='max-w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent'>
        <HighlightedCode code={code} language={lang} />
      </div>
    </div>
  );
});

const createMarkdownComponents = (): Components => ({
  p: ({ children }) => (
    <p className='mb-4 last:mb-0 leading-relaxed text-sm sm:text-base text-left whitespace-pre-wrap'>
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className='mb-4 list-disc marker:text-zinc-500 pl-6 space-y-2 text-left'>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className='mb-4 list-decimal marker:text-zinc-500 pl-6 space-y-2 text-left'>
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className='text-sm sm:text-base leading-relaxed text-left whitespace-pre-wrap pl-2'>
      {children}
    </li>
  ),
  h1: ({ children }) => (
    <h1 className='text-2xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent text-left'>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className='text-xl font-bold mb-3 text-left'>{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className='text-lg font-bold mb-2 text-left'>{children}</h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className='border-l-4 border-primary/20 pl-4 italic my-4 bg-muted/30 rounded-r-lg py-2 text-sm sm:text-base text-left whitespace-pre-wrap'>
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className='overflow-x-auto my-4 rounded-lg border border-border'>
      <table className='min-w-full divide-y divide-border text-left'>
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className='px-4 py-2 text-left font-semibold bg-muted/50'>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className='px-4 py-2 border-t text-left whitespace-pre-wrap'>
      {children}
    </td>
  ),
  pre: ({ children }) => (
    <div className='not-prose my-4 text-left'>{children}</div>
  ),
  code(props) {
    const { className, children } = props;
    const match = /language-(\w+)/.exec(className || "");
    let lang = match ? match[1].toLowerCase() : "text";

    const code = String(children).replace(/\n$/, "");
    if (code.includes("<?php") || code.includes("<?=")) {
      lang = "php";
    }

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

    lang = languageMap[lang] || lang;
    return <CodeBlock code={code} lang={lang} className={className} />;
  },
});

export function MessageContent({
  content,
  isStreaming = false,
}: MessageContentProps) {
  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const animationFrameRef = useRef<number>();
  const lastUpdateTimeRef = useRef<number>(0);

  // Memoize the markdown components
  const markdownComponents = useMemo(() => createMarkdownComponents(), []);

  // Memoize the rendered content when streaming is complete
  const renderedContent = useMemo(() => {
    if (!isComplete) return null;

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        className='prose prose-sm dark:prose-invert max-w-none break-words'
        components={markdownComponents}
      >
        {displayText}
      </ReactMarkdown>
    );
  }, [displayText, isComplete, markdownComponents]);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayText(content);
      setIsComplete(true);
      return;
    }

    let currentIndex = 0;
    const animate = (timestamp: number) => {
      if (!lastUpdateTimeRef.current) lastUpdateTimeRef.current = timestamp;

      const elapsed = timestamp - lastUpdateTimeRef.current;

      if (elapsed >= 20) {
        if (currentIndex < content.length) {
          const charsToAdd = Math.min(12, content.length - currentIndex);
          setDisplayText(content.slice(0, currentIndex + charsToAdd));
          currentIndex += charsToAdd;
          lastUpdateTimeRef.current = timestamp;
        } else {
          setIsComplete(true);
          return;
        }
      }

      if (currentIndex < content.length) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [content, isStreaming]);

  return (
    <div
      className={cn(
        "transition-all duration-200 w-full overflow-hidden px-4",
        isStreaming && !isComplete && "opacity-90"
      )}
    >
      {isComplete ? (
        renderedContent
      ) : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          className='prose prose-sm dark:prose-invert max-w-none break-words'
          components={markdownComponents}
        >
          {displayText}
        </ReactMarkdown>
      )}
    </div>
  );
}
