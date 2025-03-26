"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Avatar } from "./ui/avatar"
import { ScrollArea } from "./ui/scroll-area"
import { Send, Paperclip, Mic, Image } from "lucide-react"

// Sample user data - this should be imported from a shared location in a real app
const users = [
  {
    id: "1",
    name: "Emma Thompson",
    avatar: "/placeholder.svg?height=40&width=40",
    status: "online",
    unread: 3,
    lastMessage: "Hey, how's it going?",
  },
  {
    id: "2",
    name: "James Wilson",
    avatar: "/placeholder.svg?height=40&width=40",
    status: "online",
    unread: 0,
    lastMessage: "Can we discuss the project?",
  },
  {
    id: "3",
    name: "Sophia Martinez",
    avatar: "/placeholder.svg?height=40&width=40",
    status: "offline",
    unread: 0,
    lastMessage: "Thanks for your help!",
  },
  {
    id: "4",
    name: "Liam Johnson",
    avatar: "/placeholder.svg?height=40&width=40",
    status: "away",
    unread: 1,
    lastMessage: "I'll send you the files later",
  },
  {
    id: "5",
    name: "Olivia Davis",
    avatar: "/placeholder.svg?height=40&width=40",
    status: "online",
    unread: 0,
    lastMessage: "Let's meet tomorrow",
  },
]

type Message = {
  id: string
  content: string
  sender: "user" | "assistant"
  timestamp: Date
}

type ChatInterfaceProps = {
  selectedUser?: string | null
}

export default function ChatInterface({ selectedUser }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! How can I help you today?",
      sender: "assistant",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Find the selected user from our data
  const selectedUserData = selectedUser ? users.find((user) => user.id === selectedUser) : null

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSendMessage = () => {
    if (inputValue.trim() === "") return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")

    // Simulate assistant typing
    setIsTyping(true)

    // Simulate assistant response after a delay
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I received your message: "${inputValue}"`,
        sender: "assistant",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
      setIsTyping(false)
    }, 1500)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center p-4 border-b">
        {selectedUserData ? (
          <>
            <Avatar className="h-10 w-10 mr-3">
              <img
                src={selectedUserData.avatar || "/placeholder.svg"}
                alt={selectedUserData.name}
                className="h-full w-full object-cover"
              />
            </Avatar>
            <div>
              <h2 className="font-semibold">{selectedUserData.name}</h2>
              <p className="text-xs text-muted-foreground capitalize">{selectedUserData.status}</p>
            </div>
          </>
        ) : (
          <>
            <Avatar className="h-10 w-10 mr-3">
              <div className="bg-primary text-primary-foreground rounded-full h-full w-full flex items-center justify-center font-semibold">
                AI
              </div>
            </Avatar>
            <div>
              <h2 className="font-semibold">AI Assistant</h2>
              <p className="text-xs text-muted-foreground">Always online</p>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  message.sender === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-muted rounded-bl-none"
                }`}
              >
                <p>{message.content}</p>
                <div
                  className={`text-xs mt-1 ${
                    message.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-none px-4 py-2">
                <div className="flex space-x-1">
                  <div
                    className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="rounded-full">
            <Paperclip className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" className="rounded-full">
            <Image className="h-5 w-5" />
          </Button>
          <div className="flex-1 relative">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message..."
              className="pr-10 rounded-full"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSendMessage()
                }
              }}
            />
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full">
              <Mic className="h-5 w-5" />
            </Button>
          </div>
          <Button onClick={handleSendMessage} size="icon" className="rounded-full" disabled={inputValue.trim() === ""}>
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

