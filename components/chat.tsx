import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { MessageContent } from "./message-content";
import { AnimatedMessageContent } from "./animated-message-content";
import { 
  Loader2, Square, Send, User, Paperclip, FileText, 
  File as FilePdf, X 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { processFileForChat } from "@/components/file-processor";
import { formatFileSize } from "@/lib/client-document-processor";

// Custom AI Bot Icon component
const AIBotIcon = () => {
  return (
    <div className='w-full h-full bg-blue-500 rounded-full flex items-center justify-center'>
      <svg
        viewBox='0 0 24 24'
        className='w-4 h-4 text-white'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <circle cx='12' cy='12' r='5' />
        <path d='M12 2v4' />
        <path d='M12 18v4' />
        <path d='M4.93 4.93l2.83 2.83' />
        <path d='M16.24 16.24l2.83 2.83' />
        <path d='M2 12h4' />
        <path d='M18 12h4' />
        <path d='M4.93 19.07l2.83-2.83' />
        <path d='M16.24 7.76l2.83-2.83' />
      </svg>
    </div>
  );
};

interface Message {
  role: "user" | "assistant";
  content: string;
  attachments?: {
    type: "image" | "pdf" | "code" | "document";
    url: string;
    name: string;
    size?: number;
    content?: string;
    mimeType?: string;
  }[];
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{url: string, type: string, name: string} | null>(null);
  const [isStreamStuck, setIsStreamStuck] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastActivityTimestampRef = useRef<number>(Date.now());
  const stuckCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      messages.forEach(message => {
        message.attachments?.forEach(attachment => {
          URL.revokeObjectURL(attachment.url);
        });
      });
    };
  }, []);

  const getFileIcon = (type: string, mimeType?: string) => {
    if (type === "image") return <FileText className="h-4 w-4 text-blue-500" />;
    if (type === "pdf") return <FilePdf className="h-4 w-4 text-red-500" />;
    if (type === "code" || mimeType?.includes("application/json") || mimeType?.includes("text/html")) 
      return <FileText className="h-4 w-4 text-green-500" />;
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  const getFileType = (file: File): "image" | "pdf" | "code" | "document" => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type === "application/pdf") return "pdf";
    
    // Expanded list of programming file extensions
    const codeExtensions = [
      // Web development
      ".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".scss", ".sass", ".less",
      // Backend
      ".py", ".rb", ".php", ".java", ".cs", ".go", ".rs", ".c", ".cpp", ".h", ".hpp",
      // Data/Config
      ".json", ".xml", ".yaml", ".yml", ".toml", ".ini", ".env",
      // Mobile
      ".swift", ".kt", ".m", ".mm",
      // Shell/Scripts
      ".sh", ".bash", ".zsh", ".ps1", ".bat", ".cmd",
      // Other languages
      ".lua", ".r", ".pl", ".ex", ".exs", ".erl", ".fs", ".fsx", ".dart", ".scala",
      // Markup/Documentation
      ".md", ".mdx", ".rst", ".tex",
      // Database
      ".sql", ".graphql", ".prisma",
    ];
    
    // Check file extension against the list
    const extension = "." + file.name.split('.').pop()?.toLowerCase();
    if (codeExtensions.includes(extension)) return "code";
    
    // Check MIME type for code-related content
    if (
      file.type.includes("javascript") || 
      file.type.includes("typescript") || 
      file.type.includes("json") || 
      file.type.includes("html") || 
      file.type.includes("css") ||
      file.type.includes("text/x-") ||  // Many code MIME types start with text/x-
      file.type.includes("application/x-") ||
      file.type.includes("text/plain") // Plain text could be code
    ) return "code";
    
    return "document";
  };

  // Using formatFileSize from our client-document-processor library

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      if (file.type.startsWith("image/")) {
        resolve(""); // Skip reading image content
        return;
      }

      // Handle PDF files
      if (file.type === "application/pdf") {
        // For PDFs, we'll just provide a clear message and let the user describe the content
        const pdfInfo = `[PDF ATTACHED: ${file.name} (${formatFileSize(file.size)})]

I've attached a PDF document to this message. Please note:

• This system cannot automatically read or analyze PDF contents
• The AI will not try to guess what's in the PDF based on the filename
• For best results, please:
  1. Briefly describe what this PDF contains in your own words
  2. Ask specific questions about the content you're interested in
  3. If needed, quote relevant sections from the PDF in your message

The AI will respond based on your description and questions, not based on any automatic analysis of the PDF.`;

        resolve(pdfInfo);
        return;
      }
      
      // Handle DOC/DOCX files
      if (file.type === "application/msword" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        try {
          // Process DOC/DOCX using our document processing API
          const formData = new FormData();
          formData.append('file', file);
          formData.append('prompt', 'Extract and analyze the content of this document.');
          
          const response = await fetch('/api/process-document', {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            throw new Error(`Failed to process document: ${response.status} ${response.statusText}`);
          }
          
          const result = await response.json();
          const docContent = `[DOCUMENT PROCESSED: ${file.name} (${formatFileSize(file.size)})]\n\nDocument Analysis:\n${result.text}\n\nYou can ask follow-up questions about this document.`;
          
          resolve(docContent);
        } catch (error) {
          console.error('Error processing document:', error);
          // Fallback message if processing fails
          const fallbackMsg = `[DOCUMENT ATTACHED: ${file.name} (${formatFileSize(file.size)})]\n\nI've attached a document, but there was an error processing it automatically. Please describe what this document contains in your own words.`;
          resolve(fallbackMsg);
        }
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        // For text files, limit the content size to prevent overwhelming the LLM
        const content = e.target?.result as string;
        const maxLength = 5000; // Limit to 5000 characters
        
        if (content && content.length > maxLength) {
          resolve(content.substring(0, maxLength) + `\n\n[Content truncated due to size. Total size: ${content.length} characters]`);
        } else {
          resolve(content || "");
        }
      };
      reader.onerror = (e) => {
        reject(e);
      };

      // Expanded list of text-based file extensions
      const textExtensions = [
        // Web development
        ".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".scss", ".sass", ".less",
        // Backend
        ".py", ".rb", ".php", ".java", ".cs", ".go", ".rs", ".c", ".cpp", ".h", ".hpp",
        // Data/Config
        ".json", ".xml", ".yaml", ".yml", ".toml", ".ini", ".env",
        // Mobile
        ".swift", ".kt",
        // Shell/Scripts
        ".sh", ".bash", ".zsh", ".ps1", ".bat", ".cmd",
        // Other languages
        ".lua", ".r", ".pl", ".ex", ".exs", ".erl", ".fs", ".fsx", ".dart", ".scala",
        // Markup/Documentation
        ".md", ".mdx", ".rst", ".tex",
        // Database
        ".sql", ".graphql", ".prisma",
        // Plain text
        ".txt", ".log",
      ];
      
      // Check file extension against the list
      const extension = "." + file.name.split('.').pop()?.toLowerCase();
      
      // Use readAsText for text files, readAsDataURL for binary files
      if (
        textExtensions.includes(extension) ||
        file.type.includes("text") || 
        file.type.includes("javascript") || 
        file.type.includes("typescript") || 
        file.type.includes("json") || 
        file.type.includes("html") || 
        file.type.includes("css") ||
        file.type.includes("application/x-") ||
        file.type.includes("text/x-")
      ) {
        reader.readAsText(file);
      } else {
        // For unknown file types, try to read as text first
        reader.readAsText(file);
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const openFilePreview = (url: string, type: string, name: string) => {
    setPreviewFile({ url, type, name });
  };

  const closeFilePreview = () => {
    setPreviewFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachedFiles.length === 0) || isLoading) return;

    const attachments: Message["attachments"] = [];
    let fileContent = "";
    let timeoutId: NodeJS.Timeout | undefined;
    
    if (attachedFiles.length > 0) {
      setIsUploading(true);
      let processedFiles = 0;
      
      for (const file of attachedFiles) {
        try {
          setUploadProgress(Math.floor((processedFiles / attachedFiles.length) * 100));
          
          const content = await readFileContent(file);
          // Format file content with clear separation and metadata
          fileContent += content ? 
            `\n\n--- FILE: ${file.name} (${formatFileSize(file.size)}) ---\n${content}\n--- END OF FILE ---\n\n` : 
            "";

          const fileType = getFileType(file);
          const objectUrl = URL.createObjectURL(file);

          attachments.push({
            type: fileType,
            url: objectUrl,
            name: file.name,
            size: file.size,
            content: content || undefined,
            mimeType: file.type,
          });
          
          processedFiles++;
          setUploadProgress(Math.floor((processedFiles / attachedFiles.length) * 100));
        } catch (error) {
          console.error("Error reading file:", error);
        }
      }
      
      setIsUploading(false);
      setUploadProgress(0);
    }

    const userMessage: Message = {
      role: "user",
      content: input,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setAttachedFiles([]);
    setIsLoading(true);
    setStreamingContent("");
    setIsStreamStuck(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    abortControllerRef.current = new AbortController();

    // Set up the stuck check interval
    if (stuckCheckIntervalRef.current) {
      clearInterval(stuckCheckIntervalRef.current);
    }
    
    lastActivityTimestampRef.current = Date.now();
    stuckCheckIntervalRef.current = setInterval(() => {
      const currentTime = Date.now();
      const timeSinceLastActivity = currentTime - lastActivityTimestampRef.current;
      
      // If no activity for 15 seconds and we're still loading, consider it stuck
      if (isLoading && timeSinceLastActivity > 15000) {
        setIsStreamStuck(true);
        // Once we've determined it's stuck, we can clear the interval
        if (stuckCheckIntervalRef.current) {
          clearInterval(stuckCheckIntervalRef.current);
          stuckCheckIntervalRef.current = null;
        }
      }
    }, 5000); // Check every 5 seconds

    try {
      console.log("Sending file content:", fileContent); // Debug log
      
      const response = await fetch("/api/chat-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          fileContent: fileContent.trim(),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch response: ${response.status} ${response.statusText}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      // Add timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "Request timed out. The response took too long to complete.",
            },
          ]);
          setIsLoading(false);
          setStreamingContent("");
        }
      }, 60000); // 60 seconds timeout

      let accumulatedContent = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Update activity timestamp whenever we receive data
        lastActivityTimestampRef.current = Date.now();
        // Reset the stuck state if we were previously stuck
        if (isStreamStuck) {
          setIsStreamStuck(false);
        }
        
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
                // Update activity timestamp
                lastActivityTimestampRef.current = Date.now();
              }
            } catch (e) {
              console.error("Error parsing chunk:", e);
              // Continue processing without crashing
              // Try to recover partial content if possible
              if (typeof data === "string" && data.includes('"content":')) {
                try {
                  // Try to extract content between quotes
                  const contentMatch = /"content":"([^"]*)/.exec(data);
                  if (contentMatch && contentMatch[1]) {
                    accumulatedContent += contentMatch[1];
                    setStreamingContent(accumulatedContent);
                  }
                } catch (extractError) {
                  console.error(
                    "Failed to extract partial content:",
                    extractError
                  );
                }
              }
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
            content: `Sorry, there was an error processing your request: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ]);
      }
    } finally {
      // Clear any timeout if it was set
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Clear the stuck check interval
      if (stuckCheckIntervalRef.current) {
        clearInterval(stuckCheckIntervalRef.current);
        stuckCheckIntervalRef.current = null;
      }
      
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
      setIsStreamStuck(false);
      
      // Clear the stuck check interval
      if (stuckCheckIntervalRef.current) {
        clearInterval(stuckCheckIntervalRef.current);
        stuckCheckIntervalRef.current = null;
      }
    }
  };
  
  // Function to handle continuing a stuck response
  const handleContinueResponse = () => {
    // Get the last user message
    const lastUserMessageIndex = messages.findLastIndex(msg => msg.role === "user");
    if (lastUserMessageIndex >= 0) {
      // Create a new message with the same content but add a note
      const lastUserMessage = messages[lastUserMessageIndex];
      const continuationMessage: Message = {
        role: "user",
        content: lastUserMessage.content + "\n\n[Please continue your previous response]",
        attachments: lastUserMessage.attachments,
      };
      
      // Add the continuation message and submit
      setMessages(prev => [...prev]);
      setInput("");
      setIsLoading(true);
      setStreamingContent("");
      setIsStreamStuck(false);
      
      // Reset activity timestamp
      lastActivityTimestampRef.current = Date.now();
      
      // Submit the continuation message
      handleSubmit({
        preventDefault: () => {},
      } as React.FormEvent);
    }
  };

  return (
    <div className='flex flex-col h-full'>
      <ScrollArea ref={scrollRef} className='flex-1 px-4'>
        <div className='py-6 space-y-6'>
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start gap-4 max-w-full",
                message.role === "assistant" && "justify-start",
                message.role === "user" && "justify-end"
              )}
            >
              {message.role === "assistant" && (
                <div className='w-8 h-8 rounded-full flex items-center justify-center overflow-hidden'>
                  <AIBotIcon />
                </div>
              )}
              <div className='flex flex-col gap-2 max-w-[85%]'>
                {message.attachments && message.attachments.length > 0 && (
                  <div className='flex flex-wrap gap-2'>
                    {message.attachments.map((attachment, i) => (
                      <div
                        key={i}
                        className='rounded-lg overflow-hidden border bg-muted/30 p-2 flex flex-col gap-1'
                      >
                        {attachment.type === "image" ? (
                          <div className="cursor-pointer" onClick={() => openFilePreview(attachment.url, attachment.type, attachment.name)}>
                            <img
                              src={attachment.url}
                              alt={attachment.name}
                              className='max-w-sm max-h-48 rounded object-cover'
                            />
                            <div className='flex items-center justify-between mt-1'>
                              <span className='text-xs truncate max-w-[150px]'>{attachment.name}</span>
                              {attachment.size && (
                                <Badge variant="outline" className="text-xs">
                                  {formatFileSize(attachment.size)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className='flex items-center gap-2 cursor-pointer' onClick={() => openFilePreview(attachment.url, attachment.type, attachment.name)}>
                            {getFileIcon(attachment.type, attachment.mimeType)}
                            <div className='flex flex-col'>
                              <span className='text-sm font-medium truncate max-w-[150px]'>{attachment.name}</span>
                              {attachment.size && (
                                <span className='text-xs text-muted-foreground'>{formatFileSize(attachment.size)}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 shadow-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.role === "assistant" ? (
                    <AnimatedMessageContent content={message.content} />
                  ) : (
                    <MessageContent content={message.content} />
                  )}
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
            <div className='flex items-start gap-4 max-w-full'>
              <div className='w-8 h-8 rounded-full flex items-center justify-center overflow-hidden'>
                <AIBotIcon />
              </div>
              <div className='bg-muted rounded-2xl px-4 py-3'>
                <AnimatedMessageContent content={streamingContent} isStreaming={true} typingSpeed={10} />
                <span className='inline-flex ml-1'>
                  <span className='h-1.5 w-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]'></span>
                  <span className='h-1.5 w-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s] mx-1'></span>
                  <span className='h-1.5 w-1.5 bg-primary rounded-full animate-bounce'></span>
                </span>
              </div>
            </div>
          )}
          {isStreamStuck && (
            <div className='flex items-start gap-4 max-w-full'>
              <div className='w-8 h-8 rounded-full flex items-center justify-center overflow-hidden'>
                <AIBotIcon />
              </div>
              <div className='bg-yellow-100 dark:bg-yellow-900 rounded-2xl px-4 py-3 flex flex-col gap-2'>
                <p className='text-sm text-yellow-800 dark:text-yellow-200'>
                  The response seems to be taking longer than expected or may have stopped.
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="self-start"
                    onClick={handleContinueResponse}
                  >
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Continue Response
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="self-start"
                    onClick={handleStop}
                  >
                    <Square className="h-3 w-3 mr-2" />
                    Stop
                  </Button>
                </div>
              </div>
            </div>
          )}
          {isLoading && !streamingContent && !isStreamStuck && (
            <div className='flex items-start gap-4 max-w-full'>
              <div className='w-8 h-8 rounded-full flex items-center justify-center overflow-hidden'>
                <AIBotIcon />
              </div>
              <div className='bg-muted rounded-2xl px-4 py-3'>
                <div className='flex items-center gap-2'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  <p className='text-sm'>Thinking...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className='border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        {isUploading && (
          <div className="px-4 py-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">Uploading files...</span>
              <span className="text-sm">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-1" />
          </div>
        )}
        
        {attachedFiles.length > 0 && (
          <div className="px-4 py-2 flex flex-wrap gap-2 border-b">
            {attachedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-1 bg-muted/50 rounded-full pl-2 pr-1 py-1">
                {getFileIcon(getFileType(file), file.type)}
                <span className="text-xs truncate max-w-[100px]">{file.name}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5" 
                  onClick={() => removeFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        <form
          onSubmit={handleSubmit}
          className='max-w-3xl mx-auto p-4 flex gap-2'
        >
          <input
            type='file'
            ref={fileInputRef}
            className='hidden'
            multiple
            accept='image/*,.pdf,.doc,.docx,.txt,.json,.js,.ts,.jsx,.tsx,.html,.css,.md,.py,.rb,.php,.java,.cs,.go,.rs,.c,.cpp,.h,.hpp,.scss,.sass,.less,.yaml,.yml,.toml,.ini,.env,.swift,.kt,.sh,.bash,.zsh,.ps1,.bat,.cmd,.lua,.r,.pl,.ex,.exs,.erl,.fs,.fsx,.dart,.scala,.mdx,.rst,.tex,.sql,.graphql,.prisma,.xml'
            onChange={handleFileChange}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='flex-none'
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                >
                  <Paperclip className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attach files</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Ask anything...'
            disabled={isLoading}
            className='flex-1'
          />
          {isLoading ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type='button'
                    variant='destructive'
                    size='icon'
                    onClick={handleStop}
                  >
                    <Square className='h-4 w-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Stop generating</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type='submit' size='icon'>
                    <Send className='h-4 w-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Send message</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </form>
      </div>
      
      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open: boolean) => !open && closeFilePreview()}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewFile && getFileIcon(previewFile.type)}
              <span className="truncate">{previewFile?.name}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {previewFile?.type === "image" ? (
              <img 
                src={previewFile.url} 
                alt={previewFile.name} 
                className="max-w-full max-h-[60vh] object-contain mx-auto"
              />
            ) : previewFile?.type === "pdf" ? (
              <iframe 
                src={previewFile.url} 
                title={previewFile.name}
                className="w-full h-[60vh]"
              />
            ) : (
              <div className="bg-muted p-4 rounded-md overflow-auto max-h-[60vh]">
                <pre className="whitespace-pre-wrap break-words text-sm">
                  <code>Loading content...</code>
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
