import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { PlusCircle, FileText, Image, FileUp, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Chat } from "./chat";
import { GradientTitle } from "./gradient-title";

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
}

export function ChatLayout() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile on initial render and when window resizes
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Set initial value
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Clean up event listener
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Set sidebar state based on device type
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "New Chat",
      timestamp: new Date(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSession(newSession.id);
  };

  return (
    <div className='relative flex flex-1'>
      {/* Sidebar */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 z-50 w-64 bg-muted/30 border-r transition-transform duration-200 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className='flex flex-col h-full p-4'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-lg font-semibold'>Chats</h2>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className='h-4 w-4' />
            </Button>
          </div>
          <Button
            onClick={createNewChat}
            className='mb-4 flex items-center gap-2 text-white bg-blue-500 hover:bg-blue-600'
            variant='outline'
          >
            <PlusCircle className='h-4 w-4' />
            New Chat
          </Button>
          <div className='flex-1 overflow-auto space-y-2 mb-4'>
            {sessions.map((session) => (
              <Button
                key={session.id}
                variant={activeSession === session.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start text-left",
                  activeSession === session.id &&
                    "text-white bg-blue-500 hover:bg-blue-600"
                )}
                onClick={() => setActiveSession(session.id)}
              >
                <FileText className='h-4 w-4 mr-2' />
                {session.title}
              </Button>
            ))}
          </div>
          <div className='space-y-4 mt-auto'>
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={cn(
          "flex-1 transition-all duration-200 ease-in-out",
          isSidebarOpen ? "ml-64" : "ml-0"
        )}
      >
        <div className='h-full flex flex-col'>
          {/* Top Bar */}
          <div className='p-4 flex items-center justify-between border-b'>
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
            <div className='w-10' /> {/* Spacer for balance */}
          </div>

          {/* Chat Area */}
          <div className='flex-1 overflow-hidden'>
            <div className='mx-auto h-full'>
              <Chat />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
