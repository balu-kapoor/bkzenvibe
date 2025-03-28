import { useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";

interface MessageContentProps {
  content: string;
}

export function MessageContent({ content }: MessageContentProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className='prose prose-sm dark:prose-invert max-w-none'
      components={{
        code: ({ inline, className, children, ...props }: Components['code']) => {
          const match = /language-(\w+)/.exec(className || "");
          const code = String(children).replace(/\n$/, "");

          if (!inline && match) {
            return (
              <div className='relative code-block group'>
                <button
                  onClick={() => handleCopy(code)}
                  className='absolute right-2 top-2 p-2 rounded bg-gray-800/50 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2'
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
                  className='!mt-0 !bg-gray-900 !p-4 rounded-lg'
                  showLineNumbers={true}
                  wrapLines={true}
                  customStyle={{
                    margin: 0,
                    background: 'rgb(17, 24, 39)',
                    fontSize: '0.875rem',
                  }}
                  codeTagProps={{
                    style: {
                      backgroundColor: "transparent",
                      fontSize: 'inherit',
                    }
                  }}
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
          return <p className='mb-4 last:mb-0'>{children}</p>;
        },
        ul({ children }) {
          return <ul className='list-disc pl-4 mb-4 last:mb-0'>{children}</ul>;
        },
        ol({ children }) {
          return (
            <ol className='list-decimal pl-4 mb-4 last:mb-0'>{children}</ol>
          );
        },
        li({ children }) {
          return <li className='mb-1 last:mb-0'>{children}</li>;
        },
        h1({ children }) {
          return <h1 className='text-2xl font-bold mb-4'>{children}</h1>;
        },
        h2({ children }) {
          return <h2 className='text-xl font-bold mb-3'>{children}</h2>;
        },
        h3({ children }) {
          return <h3 className='text-lg font-bold mb-2'>{children}</h3>;
        },
        blockquote({ children }) {
          return (
            <blockquote className='border-l-2 border-primary pl-4 italic'>
              {children}
            </blockquote>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
