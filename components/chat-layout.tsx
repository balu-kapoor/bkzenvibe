import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import {
  FileText,
  Menu,
  X,
  Sparkles,
  PlusCircle,
  Trash,
  MessageSquare,
  Settings,
  Info,
  ImageIcon,
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

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

interface ChatState {
  sessions: ChatSession[];
  selectedId: string | null;
}

export function ChatLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const isInitialMount = useRef(true);

  // Initialize with empty state
  const [chatState, setChatState] = useState<ChatState>({
    sessions: [],
    selectedId: null,
  });

  // Load state from localStorage after mount
  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem("chatSessions");
      const savedSelectedId = localStorage.getItem("selectedChatId");

      if (savedSessions || savedSelectedId) {
        setChatState({
          sessions: savedSessions ? JSON.parse(savedSessions) : [],
          selectedId: savedSelectedId || null,
        });
      }
    } catch (error) {
      console.error("Error loading chat state:", error);
    }
  }, []);

  // Combined effect for localStorage updates
  useEffect(() => {
    if (typeof window === "undefined" || isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    try {
      // Update sessions
      if (chatState.sessions.length > 0) {
        localStorage.setItem(
          "chatSessions",
          JSON.stringify(chatState.sessions)
        );
      } else {
        localStorage.removeItem("chatSessions");
      }

      // Update selectedId
      if (chatState.selectedId) {
        localStorage.setItem("selectedChatId", chatState.selectedId);
      } else {
        localStorage.removeItem("selectedChatId");
      }
    } catch (error) {
      console.error("Error saving chat state:", error);
    }
  }, [chatState]);

  // Mobile detection and sidebar state
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkIfMobile = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
      setIsSidebarOpen(!isMobileView); // Close sidebar on mobile, open on desktop
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const createNewChat = () => {
    const newId = Date.now().toString();
    const newSession = { id: newId, title: "New Chat", messages: [] };

    setChatState((prev) => ({
      sessions: [...prev.sessions, newSession],
      selectedId: newId,
    }));
  };

  const deleteChat = (id: string) => {
    setChatState((prev) => ({
      sessions: prev.sessions.filter((session) => session.id !== id),
      selectedId: prev.selectedId === id ? null : prev.selectedId,
    }));
  };

  const updateChatMessages = (id: string, messages: Message[]) => {
    if (!id) return;

    setChatState((prev) => {
      const updatedSessions = prev.sessions.map((session) =>
        session.id === id
          ? {
              ...session,
              messages,
              title: messages[0]?.content.slice(0, 30) || "New Chat",
            }
          : session
      );

      return {
        ...prev,
        sessions: updatedSessions,
      };
    });
  };

  const selectChat = (id: string) => {
    if (!id) return;

    setChatState((prev) => ({
      ...prev,
      selectedId: id,
    }));
  };

  return (
    <div className='flex h-screen overflow-hidden'>
      {/* Sidebar */}
      <div
        className={cn(
          "bg-background/50 border-r border-r-muted/20 flex flex-col backdrop-blur-xl transition-all duration-300 relative overflow-hidden",
          isSidebarOpen ? "w-64" : "w-0 border-r-0"
        )}
      >
        <div
          className={cn(
            "absolute inset-0 flex flex-col w-64 transition-transform duration-300",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Top gradient overlay */}
          <div className='absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-purple-500/10 pointer-events-none' />

          {/* Fixed top section */}
          <div className='p-4 flex flex-col gap-4 relative z-10'>
            <Button
              onClick={createNewChat}
              className='w-full flex items-center gap-2 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 hover:from-purple-600 hover:via-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden'
            >
              <div className='absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
              <PlusCircle className='w-4 h-4 relative z-10' />
              <span className='relative z-10'>New Chat</span>
            </Button>

            <Alert
              variant='warning'
              className='bg-orange-500/5 border-none shadow-sm backdrop-blur-sm rounded-xl relative overflow-hidden group'
            >
              <div className='absolute inset-0 bg-gradient-to-r from-orange-500/10 via-yellow-500/10 to-orange-500/10 opacity-50' />
              <div className='absolute inset-0 bg-gradient-to-br from-orange-500/20 via-transparent to-transparent' />
              <div className='flex gap-3 items-start relative z-10'>
                <Info className='h-5 w-5 text-orange-400 mt-0.5 flex-shrink-0' />
                <AlertDescription className='text-sm font-medium text-orange-500/90'>
                  Currently using local storage for chats. Messages are
                  temporary and stored only in your browser.
                </AlertDescription>
              </div>
            </Alert>
          </div>

          {/* Scrollable chat list */}
          <div className='flex-1 min-h-0 overflow-y-auto'>
            <div className='px-4 py-2'>
              <div className='flex flex-col gap-2'>
                {chatState.sessions.map((session) => (
                  <div key={session.id}>
                    <Button
                      variant={
                        chatState.selectedId === session.id
                          ? "secondary"
                          : "ghost"
                      }
                      className={cn(
                        "w-full flex items-center justify-between group px-3 py-2 transition-all duration-200 relative overflow-hidden",
                        chatState.selectedId === session.id
                          ? "bg-purple-500/10 hover:bg-purple-500/20 shadow-sm border border-purple-500/20"
                          : "hover:bg-purple-500/5"
                      )}
                      onClick={() => selectChat(session.id)}
                    >
                      <div className='absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                      <div className='flex items-center gap-2 flex-1 min-w-0 relative z-10'>
                        <MessageSquare className='w-4 h-4 flex-shrink-0' />
                        <span className='truncate text-sm'>
                          {session.title || "New Chat"}
                        </span>
                      </div>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 hover:bg-red-500/10 hover:text-red-500 relative z-10'
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(session.id);
                        }}
                      >
                        <Trash className='h-4 w-4' />
                      </Button>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Fixed bottom section */}
          <div className='p-4 border-t border-t-muted/20 bg-gradient-to-b from-transparent via-purple-500/5 to-purple-500/10'>
            <Link href='/image-generator' className='w-full block mb-4'>
              <Button
                variant='ghost'
                className='w-full flex items-center gap-3 hover:bg-purple-500/10 transition-all duration-300 group relative overflow-hidden px-3 py-2'
              >
                <div className='rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 p-1.5 relative'>
                  <Sparkles className='w-4 h-4 text-white' />
                </div>
                <span className='text-sm font-medium'>AI Image Generator</span>
              </Button>
            </Link>
            <div className='flex flex-col items-center gap-2'>
              <div className='h-px w-12 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent' />
              <div className='text-xs text-center font-medium bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent'>
                BK Zen Vibe Model
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className='flex-1 flex flex-col bg-gradient-to-b from-background via-background/95 to-background/90 min-w-0'>
        {/* Header with toggle button */}
        <div className='h-14 border-b border-b-muted/20 flex items-center px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75'>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8 rounded-full hover:bg-purple-500/10 hover:text-purple-500 transition-all duration-300'
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? (
              <X className='h-4 w-4' />
            ) : (
              <Menu className='h-4 w-4' />
            )}
          </Button>
        </div>

        {/* Chat content */}
        <div className='flex-1 overflow-hidden relative'>
          {chatState.selectedId ? (
            <div className='absolute inset-0'>
              <EnhancedChat
                key={chatState.selectedId}
                initialMessages={
                  chatState.sessions.find((s) => s.id === chatState.selectedId)
                    ?.messages || []
                }
                onMessagesChange={(messages) =>
                  updateChatMessages(chatState.selectedId!, messages)
                }
              />
            </div>
          ) : (
            <div className='absolute inset-0 flex flex-col items-center justify-center p-8 text-center overflow-y-auto'>
              <div className='max-w-2xl mx-auto space-y-8'>
                <div className='rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 p-3 inline-block shadow-xl hover:shadow-purple-500/20 transition-shadow duration-300 relative'>
                  <div className='absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 rounded-full blur-xl opacity-50' />
                  <Sparkles className='w-8 h-8 text-white relative z-10' />
                </div>
                <h1 className='text-4xl font-bold bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 bg-clip-text text-transparent relative'>
                  Welcome to BK Zen Vibe AI
                  <div className='absolute -inset-1 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 opacity-20 blur-2xl -z-10' />
                </h1>
                <p className='text-lg text-muted-foreground'>
                  Your intelligent companion for creative and technical
                  discussions.
                  <br />
                  Start a new chat or select an existing one to begin.
                </p>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-8'>
                  <div className='p-6 rounded-lg border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-all duration-300 group relative overflow-hidden'>
                    <div className='absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                    <FileText className='w-6 h-6 mb-3 text-purple-500 relative z-10' />
                    <h3 className='font-semibold mb-2 relative z-10'>
                      Smart Conversations
                    </h3>
                    <p className='text-sm text-muted-foreground relative z-10'>
                      Engage in natural conversations with context-aware
                      responses
                    </p>
                  </div>
                  <div className='p-6 rounded-lg border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-all duration-300 group relative overflow-hidden'>
                    <div className='absolute inset-0 bg-gradient-to-br from-blue-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                    <Settings className='w-6 h-6 mb-3 text-blue-500 relative z-10' />
                    <h3 className='font-semibold mb-2 relative z-10'>
                      Technical Expertise
                    </h3>
                    <p className='text-sm text-muted-foreground relative z-10'>
                      Get help with coding, design, and technical challenges
                    </p>
                  </div>
                </div>
                <Button
                  onClick={createNewChat}
                  className='mt-6 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 hover:from-purple-600 hover:via-blue-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] px-6 py-2 text-base font-medium relative group overflow-hidden'
                >
                  <div className='absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                  <PlusCircle className='w-4 h-4 mr-2 relative z-10' />
                  <span className='relative z-10'>Start a New Chat</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
