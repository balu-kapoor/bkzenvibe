import { useState } from "react";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSession, setActiveSession] = useState<string | null>(null);

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
          <div className='space-y-2'>
            <Button
              variant='outline'
              className='w-full justify-start hover:bg-muted/50'
              onClick={() => document.getElementById("pdf-upload")?.click()}
            >
              <FileText className='h-4 w-4 mr-2' />
              Upload PDF
              <input
                id='pdf-upload'
                type='file'
                accept='.pdf'
                className='hidden'
                onChange={(e) => {
                  // Handle PDF upload
                }}
              />
            </Button>
            <Button
              variant='outline'
              className='w-full justify-start hover:bg-muted/50'
              onClick={() => document.getElementById("doc-upload")?.click()}
            >
              <FileText className='h-4 w-4 mr-2' />
              Upload Document
              <input
                id='doc-upload'
                type='file'
                accept='.doc,.docx'
                className='hidden'
                onChange={(e) => {
                  // Handle document upload
                }}
              />
            </Button>
            <Button
              variant='outline'
              className='w-full justify-start hover:bg-muted/50'
              onClick={() => document.getElementById("image-upload")?.click()}
            >
              <Image className='h-4 w-4 mr-2' />
              Upload Image
              <input
                id='image-upload'
                type='file'
                accept='image/*'
                className='hidden'
                onChange={(e) => {
                  // Handle image upload
                }}
              />
            </Button>
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
            <Chat />
          </div>
        </div>
      </div>
    </div>
  );
}
