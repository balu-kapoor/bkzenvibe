import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  FileText,
  Menu,
  X,
  Sparkles,
  PlusCircle,
  Trash,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EnhancedChat } from "./enhanced-chat";
import { GradientTitle } from "./gradient-title";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

export function ChatLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  // Check if device is mobile on initial render and when window resizes
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // Set sidebar state based on device type
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  return (
    <div className='relative flex flex-1 h-screen overflow-hidden'>
      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-64 bg-muted/30 border-r transition-all duration-200 ease-in-out flex flex-col h-full",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className='flex flex-col h-full p-4 overflow-hidden'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-semibold'>Chat</h2>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className='h-4 w-4' />
            </Button>
          </div>
          <div className='space-y-4 mt-auto'>
            <Link href='/image-generator'>
              <Button
                variant='ghost'
                className='w-full justify-start text-left hover:bg-blue-100 dark:hover:bg-blue-900'
              >
                <Sparkles className='h-4 w-4 mr-2 text-purple-500' />
                AI Image Generator
              </Button>
            </Link>
            <div className='bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950 dark:to-purple-950 p-4 rounded-lg border border-gray-200 dark:border-gray-800'>
              <h3 className='text-sm font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text'>
                Model Status
              </h3>
              <div className='flex items-center gap-2'>
                <div className='relative w-2 h-2'>
                  <div className='absolute w-full h-full rounded-full bg-green-500 animate-ping opacity-75'></div>
                  <div className='relative w-full h-full rounded-full bg-green-500'></div>
                </div>
                <p className='text-xs text-gray-600 dark:text-gray-400'>
                  BK Zen Vibe Model{" "}
                  <span className='text-green-500 font-medium'>• Active</span>
                </p>
              </div>
              <p className='text-xs text-gray-500 mt-2 italic'>
                Enhanced features in development
              </p>
            </div>
            <Alert
              variant='warning'
              className='bg-yellow-500/10 border-yellow-500/20'
            >
              <Info className='h-4 w-4' />
              <AlertDescription className='text-xs text-muted-foreground'>
                Currently using local storage for chats. Messages are temporary
                and stored only in your browser. Please save important
                conversations.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={cn(
          "flex-1 transition-all duration-200 ease-in-out h-screen overflow-hidden",
          isSidebarOpen ? "ml-64" : "ml-0"
        )}
      >
        <div className='h-full flex flex-col'>
          {/* Top Bar */}
          <div className='p-4 flex items-center justify-between border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10'>
            <div className='flex items-center'>
              {!isSidebarOpen && (
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setIsSidebarOpen(true)}
                  className='mr-4'
                >
                  <Menu className='h-4 w-4' />
                </Button>
              )}
            </div>
            <div className='flex-1 flex justify-center'>
              <GradientTitle>BK Zen Vibe</GradientTitle>
            </div>
            <div className='w-10' />
          </div>

          {/* Chat Area */}
          <div className='flex-1 overflow-hidden'>
            <div className='mx-auto h-full'>
              <EnhancedChat
                initialMessages={messages}
                onMessagesChange={setMessages}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
