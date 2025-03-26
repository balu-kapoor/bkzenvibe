import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { MessageContent } from "./message-content";
import {
  Loader2,
  Square,
  Send,
  Bot,
  User,
  Paperclip,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  attachments?: {
    type: "image" | "pdf" | "document";
    url: string;
    name: string;
    content?: string;
  }[];
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (file.type.startsWith("image/")) {
        resolve(""); // Skip reading image content
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = (e) => {
        reject(e);
      };

      if (file.type === "application/pdf") {
        // For PDFs, we might want to use a PDF.js or similar library
        // For now, we'll just read it as text
        reader.readAsText(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !fileInputRef.current?.files?.length) || isLoading)
      return;

    const attachments: Message["attachments"] = [];
    let fileContent = "";

    if (fileInputRef.current?.files?.length) {
      for (const file of Array.from(fileInputRef.current.files)) {
        try {
          const content = await readFileContent(file);
          fileContent += content ? `\n\nFile: ${file.name}\n${content}` : "";

          const type = file.type.startsWith("image/")
            ? "image"
            : file.type === "application/pdf"
            ? "pdf"
            : "document";

          attachments.push({
            type,
            url: URL.createObjectURL(file),
            name: file.name,
            content: content || undefined,
          });
        } catch (error) {
          console.error("Error reading file:", error);
        }
      }
    }

    const userMessage: Message = {
      role: "user",
      content: input,
      attachments,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          fileContent: fileContent.trim(),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      let accumulatedContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: accumulatedContent },
              ]);
              setStreamingContent("");
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulatedContent += parsed.content;
                setStreamingContent(accumulatedContent);
              }
            } catch (e) {
              console.error("Error parsing chunk:", e);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Response stopped by user." },
        ]);
      } else {
        console.error("Chat error:", error);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, there was an error processing your request.",
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      setStreamingContent("");
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setStreamingContent("");
    }
  };

  return (
    <div className='flex flex-col h-full'>
      <ScrollArea ref={scrollRef} className='flex-1 px-4'>
        <div className='max-w-3xl mx-auto py-6 space-y-6'>
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className='w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center'>
                  <Bot className='h-4 w-4 text-primary' />
                </div>
              )}
              <div className='flex flex-col gap-2'>
                {message.attachments?.map((attachment, i) => (
                  <div
                    key={i}
                    className='rounded-lg overflow-hidden border bg-muted/30 p-2'
                  >
                    {attachment.type === "image" ? (
                      <img
                        src={attachment.url}
                        alt={attachment.name}
                        className='max-w-sm rounded'
                      />
                    ) : (
                      <div className='flex items-center gap-2'>
                        <FileText className='h-4 w-4' />
                        <span className='text-sm'>{attachment.name}</span>
                      </div>
                    )}
                  </div>
                ))}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 shadow-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <MessageContent content={message.content} />
                </div>
              </div>
              {message.role === "user" && (
                <div className='w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center'>
                  <User className='h-4 w-4 text-primary' />
                </div>
              )}
            </div>
          ))}
          {streamingContent && (
            <div className='flex items-start gap-3'>
              <div className='w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center'>
                <Bot className='h-4 w-4 text-primary' />
              </div>
              <div className='bg-muted rounded-2xl px-4 py-3'>
                <MessageContent content={streamingContent} />
                <span className='inline-block w-2 h-4 ml-1 bg-primary animate-pulse' />
              </div>
            </div>
          )}
          {isLoading && !streamingContent && (
            <div className='flex items-start gap-3'>
              <div className='w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center'>
                <Bot className='h-4 w-4 text-primary' />
              </div>
              <div className='bg-muted rounded-2xl px-4 py-3 flex items-center gap-2'>
                <Loader2 className='h-4 w-4 animate-spin text-primary' />
                <span>Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className='border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <form
          onSubmit={handleSubmit}
          className='max-w-3xl mx-auto p-4 flex gap-2'
        >
          <input
            type='file'
            ref={fileInputRef}
            className='hidden'
            multiple
            accept='image/*,.pdf,.doc,.docx,.txt'
          />
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='flex-none'
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className='h-4 w-4' />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Type your message...'
            disabled={isLoading}
            className='flex-1'
          />
          {isLoading ? (
            <Button
              type='button'
              variant='destructive'
              size='icon'
              onClick={handleStop}
            >
              <Square className='h-4 w-4' />
            </Button>
          ) : (
            <Button type='submit' size='icon'>
              <Send className='h-4 w-4' />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
