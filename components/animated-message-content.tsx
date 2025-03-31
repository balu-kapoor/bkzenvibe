import { useEffect, useState, useRef, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { cn } from "@/lib/utils";
import type { Components } from "react-markdown";
import { Button } from "./ui/button";
import { Check, Copy } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import * as React from "react";

interface AnimatedMessageContentProps {
  content: string;
  isStreaming?: boolean;
  typingSpeed?: number;
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
  pre: ({ children }) => (
    <div className='not-prose my-4 text-left'>{children}</div>
  ),
  p: ({ children }) => (
    <p className='leading-7 [&:not(:first-child)]:mt-4 text-left whitespace-pre-wrap'>
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className='my-4 ml-6 list-disc marker:text-zinc-500 space-y-2 text-left'>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className='my-4 ml-6 list-decimal marker:text-zinc-500 space-y-2 text-left'>
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className='marker:text-muted-foreground text-left whitespace-pre-wrap pl-2'>
      {children}
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className='mt-4 border-l-2 pl-4 italic text-muted-foreground text-left whitespace-pre-wrap'>
      {children}
    </blockquote>
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

export function AnimatedMessageContent({
  content,
  isStreaming = false,
  typingSpeed = 8,
}: AnimatedMessageContentProps) {
  const [displayedContent, setDisplayedContent] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const contentRef = useRef(content);
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
        className='prose prose-sm dark:prose-invert max-w-none'
        components={markdownComponents}
      >
        {displayedContent}
      </ReactMarkdown>
    );
  }, [displayedContent, isComplete, markdownComponents]);

  useEffect(() => {
    if (!content) return;
    contentRef.current = content;

    if (!isStreaming) {
      setDisplayedContent(content);
      setIsVisible(true);
      setIsComplete(true);
      return;
    }

    let currentLength = displayedContent.length;
    const targetLength = content.length;

    const animate = (timestamp: number) => {
      if (!lastUpdateTimeRef.current) lastUpdateTimeRef.current = timestamp;

      const elapsed = timestamp - lastUpdateTimeRef.current;

      if (elapsed >= typingSpeed * 2) {
        if (currentLength < targetLength) {
          const charsToAdd = Math.min(12, targetLength - currentLength);
          const nextContent = content.substring(0, currentLength + charsToAdd);
          setDisplayedContent(nextContent);
          currentLength += charsToAdd;
          lastUpdateTimeRef.current = timestamp;
        } else {
          setIsComplete(true);
          return;
        }
      }

      if (currentLength < targetLength) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    setIsVisible(true);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [content, isStreaming, typingSpeed]);

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        isStreaming ? "transition-all duration-50" : "",
        isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      {isComplete ? (
        renderedContent
      ) : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          className='prose prose-sm dark:prose-invert max-w-none'
          components={markdownComponents}
        >
          {displayedContent}
        </ReactMarkdown>
      )}
    </div>
  );
}
