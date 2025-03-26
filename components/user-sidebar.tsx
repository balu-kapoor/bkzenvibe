"use client"

import { useState } from "react"
import { Search, Users, Plus, Settings, LogOut } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

// Sample user data
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

type UserSidebarProps = {
  onSelectUser: (userId: string) => void
  selectedUser: string | null
}

export default function UserSidebar({ onSelectUser, selectedUser }: UserSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredUsers = users.filter((user) => user.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "away":
        return "bg-yellow-500"
      case "offline":
        return "bg-gray-400"
      default:
        return "bg-gray-400"
    }
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h2 className="font-semibold">Contacts</h2>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <div className="px-2 pb-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredUsers.map((user) => (
                <SidebarMenuItem key={user.id}>
                  <SidebarMenuButton asChild isActive={selectedUser === user.id} onClick={() => onSelectUser(user.id)}>
                    <div className="flex items-center gap-3 w-full">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <img
                            src={user.avatar || "/placeholder.svg"}
                            alt={user.name}
                            className="h-full w-full object-cover"
                          />
                        </Avatar>
                        <div
                          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${getStatusColor(user.status)}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="font-medium truncate">{user.name}</span>
                          {user.unread > 0 && (
                            <Badge variant="default" className="ml-2 px-1.5 py-0.5 text-xs">
                              {user.unread}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{user.lastMessage}</p>
                      </div>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <div className="flex items-center gap-2">
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

