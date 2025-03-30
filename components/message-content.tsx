import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import type { Components } from "react-markdown";

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
        "transition-all duration-200",
        isStreaming && !isComplete && "opacity-90"
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        className='prose prose-sm dark:prose-invert max-w-none'
        components={{
          code: ({ inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const code = String(children).replace(/\n$/, "");

            if (!inline && match) {
              return (
                <div className='relative code-block group'>
                  <button
                    onClick={() => handleCopy(code)}
                    className='absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-800/50 hover:bg-gray-800 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1'
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
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag='div'
                    className='!bg-gray-900 !p-4 rounded-lg'
                    codeTagProps={{ style: { backgroundColor: "transparent" } }}
                    {...props}
                  >
                    {code}
                  </SyntaxHighlighter>
                </div>
              );
            }
            return (
              <code
                className={cn(
                  "bg-muted/50 px-1.5 py-0.5 rounded text-sm",
                  className
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className='mb-4 last:mb-0 leading-relaxed'>{children}</p>;
          },
          ul({ children }) {
            return (
              <ul className='list-disc pl-4 mb-4 last:mb-0 space-y-1'>
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol className='list-decimal pl-4 mb-4 last:mb-0 space-y-1'>
                {children}
              </ol>
            );
          },
          li({ children }) {
            return <li className='mb-1 last:mb-0'>{children}</li>;
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
              <blockquote className='border-l-4 border-primary/20 pl-4 italic my-4 bg-muted/30 rounded-r-lg py-2'>
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
        }}
      >
        {displayText}
      </ReactMarkdown>
    </div>
  );
}
