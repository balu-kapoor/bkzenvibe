import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import type { Components } from "react-markdown";
import type { CSSProperties } from "react";

interface MessageContentProps {
  content: string;
  isStreaming?: boolean;
}

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
        // Add 1-3 characters at a time for more natural effect
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
    }, 20); // Adjust speed as needed

    return () => clearInterval(interval);
  }, [content, isStreaming]);

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div
      className={cn(
        "transition-all duration-200 w-full",
        isStreaming && !isComplete && "opacity-90"
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        className='prose prose-sm dark:prose-invert max-w-none break-words w-full'
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const code = String(children).replace(/\n$/, "");

            if (className && match) {
              return (
                <div className='relative code-block group not-prose'>
                  <button
                    onClick={() => handleCopy(code)}
                    className='absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-800/50 hover:bg-gray-800 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1 z-10'
                    aria-label='Copy code to clipboard'
                  >
                    {copiedCode === code ? (
                      <>
                        <Check className='h-3.5 w-3.5 flex-shrink-0' />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className='h-3.5 w-3.5 flex-shrink-0' />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <div className='rounded-lg border border-gray-800 overflow-hidden'>
                    <div className='sticky left-0 right-0 top-0 bg-gray-900 px-4 py-2 text-xs text-gray-400 border-b border-gray-800 flex items-center justify-between'>
                      <span>{match[1]}</span>
                    </div>
                    <div className='relative w-full overflow-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent'>
                      <div style={{ width: "max-content", minWidth: "100%" }}>
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag='div'
                          className='!bg-gray-900 !p-4 !m-0 text-[13px] leading-6 sm:text-sm'
                          showLineNumbers
                          customStyle={
                            {
                              margin: "0",
                              padding: "1rem",
                              backgroundColor: "#1a1a1a",
                            } as { [key: string]: string }
                          }
                          {...props}
                        >
                          {code}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <code
                className={cn(
                  "bg-muted/50 px-1.5 py-0.5 rounded text-sm break-words",
                  className
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
          p({ children }) {
            return (
              <p className='mb-4 last:mb-0 leading-relaxed text-sm sm:text-base'>
                {children}
              </p>
            );
          },
          ul({ children }) {
            return (
              <ul className='mb-4 list-disc pl-4 sm:pl-6 space-y-2'>
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol className='mb-4 list-decimal pl-4 sm:pl-6 space-y-2'>
                {children}
              </ol>
            );
          },
          li({ children }) {
            return (
              <li className='text-sm sm:text-base leading-relaxed'>
                {children}
              </li>
            );
          },
          h1({ children }) {
            return (
              <h1 className='text-2xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent'>
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return <h2 className='text-xl font-bold mb-3'>{children}</h2>;
          },
          h3({ children }) {
            return <h3 className='text-lg font-bold mb-2'>{children}</h3>;
          },
          blockquote({ children }) {
            return (
              <blockquote className='border-l-4 border-primary/20 pl-4 italic my-4 bg-muted/30 rounded-r-lg py-2 text-sm sm:text-base'>
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className='overflow-x-auto my-4 rounded-lg border border-border'>
                <table className='min-w-full divide-y divide-border'>
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className='px-4 py-2 text-left font-semibold bg-muted/50'>
                {children}
              </th>
            );
          },
          td({ children }) {
            return <td className='px-4 py-2 border-t'>{children}</td>;
          },
          pre({ children }) {
            return <div className='not-prose overflow-hidden'>{children}</div>;
          },
        }}
      >
        {displayText}
      </ReactMarkdown>
    </div>
  );
}
