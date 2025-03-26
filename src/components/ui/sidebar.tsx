"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
import { type VariantProps, cva } from "class-variance-authority"
import { PanelLeft } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "./button"
import { Input } from "./input"
import { Separator } from "./separator"
import { Skeleton } from "./skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip"

// Define SidebarContext type
interface SidebarContextProps {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

// Constants
const SIDEBAR_WIDTH = 260
const SIDEBAR_WIDTH_COLLAPSED = 72

// Sidebar Variants
const sidebarVariants = cva(
  "group relative flex h-screen flex-col overflow-hidden border-r bg-secondary text-secondary-foreground shadow-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-0 data-[state=open]:slide-in-from-left-0",
  {
    variants: {
      variant: {
        default: "w-[var(--sidebar-width)]",
        inset: "border-l",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

type SidebarProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof sidebarVariants> & {
    width?: number
    collapsedWidth?: number
  }

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, variant, width = SIDEBAR_WIDTH, collapsedWidth = SIDEBAR_WIDTH_COLLAPSED, ...props }, ref) => {
    return (
      <aside
        ref={ref}
        className={cn(sidebarVariants({ variant, className }))}
        style={{
          "--sidebar-width": `${width}px`,
          "--sidebar-width-collapsed": `${collapsedWidth}px`,
        }}
        {...props}
      />
    )
  },
)
Sidebar.displayName = "Sidebar"

const SidebarRail = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "group relative flex h-screen w-[var(--sidebar-width-collapsed)] flex-col overflow-hidden border-r bg-secondary text-secondary-foreground shadow-sm",
        className,
      )}
      {...props}
    />
  ),
)
SidebarRail.displayName = "SidebarRail"

const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex-1 overflow-y-auto py-2 px-3", className)} {...props} />
  ),
)
SidebarContent.displayName = "SidebarContent"

const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex h-16 items-center px-4", className)} {...props} />
  ),
)
SidebarHeader.displayName = "SidebarHeader"

const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex h-16 items-center px-4", className)} {...props} />
  ),
)
SidebarFooter.displayName = "SidebarFooter"

const SidebarTrigger = React.forwardRef<React.ElementRef<typeof Button>, React.ComponentPropsWithoutRef<typeof Button>>(
  ({ className, ...props }, ref) => {
    const { collapsed, setCollapsed } = useSidebar()
    const isMobile = useIsMobile()

    const handleToggle = useCallback(() => {
      if (isMobile) {
        // Handle mobile-specific logic if needed
        // For example, open a sheet or modal
        console.log("Mobile toggle")
      } else {
        setCollapsed(!collapsed)
      }
    }, [collapsed, setCollapsed, isMobile])

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={ref}
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 rounded-md p-0 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                className,
              )}
              onClick={handleToggle}
              {...props}
            >
              <PanelLeft className="h-4 w-4" />
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" align="center">
            Toggle Sidebar
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  },
)
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1 px-2 py-1.5", className)} {...props} />
  ),
)
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupLabel = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm font-medium text-muted-foreground", className)} {...props} />
  ),
)
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("space-y-1.5 py-2", className)} {...props} />,
)
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarGroupAction = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("mt-2 px-2", className)} {...props} />,
)
SidebarGroupAction.displayName = "SidebarGroupAction"

const SidebarMenu = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("relative", className)} {...props} />,
)
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuButton = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentPropsWithoutRef<typeof Button>
>(({ className, ...props }, ref) => (
  <Button
    ref={ref}
    variant="ghost"
    className={cn(
      "flex h-9 w-full items-center justify-between rounded-md px-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
      className,
    )}
    {...props}
  />
))
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarMenuAction = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("ml-auto", className)} {...props} />,
)
SidebarMenuAction.displayName = "SidebarMenuAction"

const SidebarMenuItem = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentPropsWithoutRef<typeof Button>
>(({ className, ...props }, ref) => (
  <Button
    ref={ref}
    variant="ghost"
    className={cn(
      "flex h-9 w-full items-center rounded-md px-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
      className,
    )}
    {...props}
  />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

const SidebarMenuSub = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("mt-2 space-y-1 pl-2", className)} {...props} />,
)
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubButton = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentPropsWithoutRef<typeof Button>
>(({ className, ...props }, ref) => (
  <Button
    ref={ref}
    variant="ghost"
    className={cn(
      "flex h-9 w-full items-center rounded-md px-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
      className,
    )}
    {...props}
  />
))
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

const SidebarMenuSubItem = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentPropsWithoutRef<typeof Button>
>(({ className, ...props }, ref) => (
  <Button
    ref={ref}
    variant="ghost"
    className={cn(
      "flex h-9 w-full items-center rounded-md px-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
      className,
    )}
    {...props}
  />
))
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

const SidebarMenuBadge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("ml-auto flex items-center justify-center", className)} {...props} />
  ),
)
SidebarMenuBadge.displayName = "SidebarMenuBadge"

const SidebarSeparator = React.forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentPropsWithoutRef<typeof Separator>
>(({ className, ...props }, ref) => <Separator ref={ref} className={cn("-mx-2 my-1", className)} {...props} />)
SidebarSeparator.displayName = "SidebarSeparator"

const SidebarInput = React.forwardRef<React.ElementRef<typeof Input>, React.ComponentPropsWithoutRef<typeof Input>>(
  ({ className, ...props }, ref) => (
    <Input
      ref={ref}
      size="sm"
      className={cn("rounded-md border-none bg-secondary", className)}
      placeholder="Search..."
      {...props}
    />
  ),
)
SidebarInput.displayName = "SidebarInput"

const SidebarInset = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-4", className)} {...props} />,
)
SidebarInset.displayName = "SidebarInset"

const SidebarMenuSkeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div className="flex items-center space-x-2">
      <Skeleton className="h-4 w-[110px]" />
    </div>
  ),
)
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"

interface SidebarProviderProps {
  children: React.ReactNode
}

const SidebarContext = createContext<SidebarContextProps | null>(null)

function SidebarProvider({ children }: SidebarProviderProps) {
  const [collapsed, setCollapsed] = useState(false)

  const value = useMemo(
    () => ({
      collapsed,
      setCollapsed,
    }),
    [collapsed],
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }
  return context
}

// Custom hook to detect mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // Initial check
    checkIsMobile()

    // Add event listener
    window.addEventListener("resize", checkIsMobile)

    // Cleanup
    return () => window.removeEventListener("resize", checkIsMobile)
  }, [])

  return isMobile
}

// ... (keep the rest of the component definitions, removing any Next.js specific code)

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
}

