"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageContent } from "@/components/message-content";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { generateWebApp } from "@/lib/gemini-client";
import { FileType, FileSystemState } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import {
  Loader2,
  FileCode,
  Moon,
  Sun,
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  FolderPlus,
  Move,
  Check,
  Image,
  Globe,
  ArrowUp,
  X,
  Sparkles,
  Code,
  Terminal,
  Layers,
  Palette,
  Layout,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import Link from "next/link";
import Editor, { useMonaco } from "@monaco-editor/react";
import { useDebounce } from "@/hooks/use-debounce";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  createWebAppPrompt,
  modifyWebAppPrompt,
  imageDesignPrompt,
  userImageUploadPrompt,
} from "@/lib/prompts";

// Import templates
// @ts-ignore - Simple JS file without types
import * as AppTemplates from "./app-templates.js";

export function WebAppBuilder() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  // File system state
  const [fileSystem, setFileSystem] = useState<FileSystemState>({
    files: [],
    activeFileId: null,
  });

  // Add new state for preview
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);

  // Add state for chat history
  const [chatHistory, setChatHistory] = useState<
    {
      role: "user" | "assistant";
      content: string;
      timestamp: Date;
    }[]
  >([]);

  // Create a ref for the chat container
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isGenerating]);

  // Function to format date
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Add state for image attachment
  const [imageAttachment, setImageAttachment] = useState<string | null>(null);

  // Add states for generating animations
  const [generatingFiles, setGeneratingFiles] = useState<string[]>([]);
  const [currentGeneratingFile, setCurrentGeneratingFile] = useState<
    string | null
  >(null);

  // Ensure generating files are initialized when generation starts
  useEffect(() => {
    if (
      isGenerating &&
      fileSystem.files.length === 0 &&
      generatingFiles.length === 0
    ) {
      const defaultFiles = [
        "src/App.tsx",
        "src/components/Button.tsx",
        "src/components/Card.tsx",
        "src/layouts/MainLayout.tsx",
        "src/index.css",
        "src/index.tsx",
        "package.json",
        "tailwind.config.js",
      ];

      setGeneratingFiles(defaultFiles);

      // Simulate file generation with animation
      const simulateFileGeneration = (files: string[], index = 0) => {
        if (index < files.length) {
          setCurrentGeneratingFile(files[index]);
          setTimeout(() => simulateFileGeneration(files, index + 1), 300);
        } else {
          setCurrentGeneratingFile(null);
        }
      };

      simulateFileGeneration(defaultFiles);
    }
  }, [isGenerating, fileSystem.files.length, generatingFiles.length]);

  // Add states for particle animation
  const [particles, setParticles] = useState<
    { x: number; y: number; size: number; color: string; speed: number }[]
  >([]);
  const [codeSnippets, setCodeSnippets] = useState<string[]>([
    "<div className='flex items-center'>",
    "const [state, setState] = useState(false);",
    "import { motion } from 'framer-motion';",
    "<Button variant='gradient'>Click me</Button>",
    "export function Component() {",
    "@keyframes pulse { 0% { opacity: 1 } }",
    "const colors = ['#3B82F6', '#8B5CF6'];",
    "interface Props { children: ReactNode }",
  ]);
  const [currentCodeSnippet, setCurrentCodeSnippet] = useState(0);
  const [typedCode, setTypedCode] = useState("");
  const [codeTypingIndex, setCodeTypingIndex] = useState(0);

  // Simulate typing code animation
  useEffect(() => {
    if (!isGenerating || fileSystem.files.length > 0) return;

    const snippet = codeSnippets[currentCodeSnippet];

    if (codeTypingIndex < snippet.length) {
      const timeoutId = setTimeout(() => {
        setTypedCode((prev) => prev + snippet[codeTypingIndex]);
        setCodeTypingIndex((prev) => prev + 1);
      }, 50 + Math.random() * 50); // Varying speed for realistic typing

      return () => clearTimeout(timeoutId);
    } else {
      // Move to next snippet after delay
      const timeoutId = setTimeout(() => {
        setCurrentCodeSnippet((prev) => (prev + 1) % codeSnippets.length);
        setTypedCode("");
        setCodeTypingIndex(0);
      }, 1500);

      return () => clearTimeout(timeoutId);
    }
  }, [
    typedCode,
    codeTypingIndex,
    currentCodeSnippet,
    isGenerating,
    fileSystem.files.length,
    codeSnippets,
  ]);

  // Generate particles for background effect
  useEffect(() => {
    if (fileSystem.files.length > 0) return;

    // Create initial particles
    const initialParticles = Array.from({ length: 30 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      color:
        Math.random() > 0.5
          ? "#3B82F6"
          : Math.random() > 0.5
          ? "#8B5CF6"
          : "#EC4899",
      speed: 0.1 + Math.random() * 0.3,
    }));

    setParticles(initialParticles);

    // Animate particles
    const animateParticles = () => {
      setParticles((prev) =>
        prev.map((particle) => ({
          ...particle,
          y: particle.y - particle.speed,
          // Reset particle when it goes off screen
          ...(particle.y < -5
            ? {
                y: 105,
                x: Math.random() * 100,
              }
            : {}),
        }))
      );
    };

    const intervalId = setInterval(animateParticles, 100);
    return () => clearInterval(intervalId);
  }, [fileSystem.files.length]);

  // Function to handle image upload
  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      setImageAttachment(imageData);

      // Enhanced prompt for image-based designs
      setPrompt((prev) => {
        return prev
          ? `${prev}\n\n${userImageUploadPrompt}`
          : userImageUploadPrompt;
      });

      // Show a success toast
      toast({
        title: "Image uploaded successfully",
        description: "The AI will use this image as reference for your design",
      });
    };
    reader.readAsDataURL(file);
  };

  // Add state for animated placeholders
  const [placeholderData, setPlaceholderData] = useState<
    {
      name: string;
      type: string;
      progress: number;
    }[]
  >([
    { name: "App.tsx", type: "component", progress: 0 },
    { name: "Button.tsx", type: "component", progress: 0 },
    { name: "Navbar.tsx", type: "component", progress: 0 },
    { name: "index.css", type: "style", progress: 0 },
    { name: "tailwind.config.js", type: "config", progress: 0 },
  ]);

  // Function to handle sending a message
  const handleSendMessage = async () => {
    if (!prompt.trim()) return;

    // Add user message to chat history
    const userMessage = {
      role: "user" as const,
      content: prompt,
      timestamp: new Date(),
    };

    setChatHistory((prev) => [...prev, userMessage]);

    // Start generating state immediately
    setIsGenerating(true);
    setError(null);

    // Save the prompt before clearing it
    const currentPrompt = prompt;

    // Check if this is the initial creation or a subsequent modification
    const isInitialCreation = fileSystem.files.length === 0;

    // Generate placeholder file list based on the prompt content
    const generateDynamicFiles = () => {
      const words = currentPrompt.toLowerCase().split(/\s+/);
      const baseFiles = [
        "src/App.tsx",
        "src/index.tsx",
        "src/index.css",
        "package.json",
        "tailwind.config.js",
      ];

      const possibleComponents = [
        "Header",
        "Footer",
        "Sidebar",
        "Navbar",
        "Card",
        "Button",
        "Modal",
        "Form",
        "Input",
        "Dropdown",
        "Carousel",
        "Hero",
        "Pricing",
        "Features",
        "Testimonials",
        "Gallery",
        "Product",
        "Dashboard",
        "Login",
        "Register",
        "Cart",
        "Checkout",
        "Profile",
      ];

      const possibleLayouts = [
        "MainLayout",
        "AuthLayout",
        "DashboardLayout",
        "PageLayout",
      ];

      const possiblePages = [
        "Home",
        "About",
        "Contact",
        "Products",
        "Services",
        "Blog",
        "Shop",
        "Account",
        "Settings",
      ];

      // Match components based on prompt keywords
      const matchedComponents = possibleComponents.filter((comp) =>
        words.some(
          (word) =>
            comp.toLowerCase().includes(word) ||
            word.includes(comp.toLowerCase())
        )
      );

      // Add some relevant components based on prompt analysis
      const selectedComponents =
        matchedComponents.length > 0
          ? matchedComponents.slice(0, 5) // Take up to 5 matched components
          : possibleComponents.slice(0, Math.floor(Math.random() * 5) + 3); // Or random 3-8 components

      // Get component files
      const componentFiles = selectedComponents.map(
        (comp) => `src/components/${comp}.tsx`
      );

      // Add layout files if relevant keywords exist
      const hasLayoutKeywords = words.some((word) =>
        ["layout", "page", "structure", "template"].includes(word)
      );

      const layoutFiles = hasLayoutKeywords
        ? possibleLayouts
            .slice(0, 2)
            .map((layout) => `src/layouts/${layout}.tsx`)
        : [possibleLayouts[0]].map((layout) => `src/layouts/${layout}.tsx`);

      // Add page files if the app seems to have multiple pages
      const hasPageKeywords = words.some((word) =>
        ["page", "route", "navigation", "link", "pages"].includes(word)
      );

      const pageFiles = hasPageKeywords
        ? possiblePages.slice(0, 4).map((page) => `src/pages/${page}.tsx`)
        : [];

      // Add hook files if relevant
      const hasHookKeywords = words.some((word) =>
        ["state", "effect", "data", "fetch", "custom"].includes(word)
      );

      const hookFiles = hasHookKeywords
        ? ["useAuth.ts", "useData.ts", "useForm.ts"].map(
            (hook) => `src/hooks/${hook}`
          )
        : [];

      // Add utility files
      const utilFiles = ["utils.ts", "helpers.ts"].map(
        (util) => `src/utils/${util}`
      );

      // Combine all files
      return [
        ...baseFiles,
        ...componentFiles,
        ...layoutFiles,
        ...pageFiles,
        ...hookFiles,
        ...utilFiles,
      ];
    };

    // Start file generation animation immediately
    if (isInitialCreation) {
      // Reset placeholder progress
      setPlaceholderData((prev) =>
        prev.map((item) => ({ ...item, progress: 0 }))
      );

      // Generate dynamic file list based on prompt
      const dynamicFiles = generateDynamicFiles();

      // Update the placeholders based on dynamic files
      const newPlaceholders = dynamicFiles.slice(0, 8).map((file) => {
        const name = file.split("/").pop() || file;
        let type = "component";

        if (file.includes("/components/")) type = "component";
        else if (file.includes(".css") || file.endsWith(".scss"))
          type = "style";
        else if (file.includes("/utils/") || file.includes("/hooks/"))
          type = "util";
        else if (file.includes(".config.") || file.endsWith(".json"))
          type = "config";
        else if (file.includes("/pages/")) type = "page";
        else if (file.includes("/layouts/")) type = "layout";

        return { name, type, progress: 0 };
      });

      setPlaceholderData(newPlaceholders);
      setGeneratingFiles(dynamicFiles);

      // Start animating the progress
      const animatePlaceholders = () => {
        setPlaceholderData((prev) =>
          prev.map((item, index) => ({
            ...item,
            progress: Math.min(item.progress + Math.random() * 15, 100),
          }))
        );
      };

      // Animate placeholders every 200ms
      const placeholderInterval = setInterval(animatePlaceholders, 200);

      // Clear interval after 5 seconds
      setTimeout(() => clearInterval(placeholderInterval), 5000);

      // Simulate file generation with animation
      const simulateFileGeneration = (files: string[], index = 0) => {
        if (index < files.length) {
          setCurrentGeneratingFile(files[index]);
          setTimeout(() => simulateFileGeneration(files, index + 1), 300);
        } else {
          setCurrentGeneratingFile(null);
        }
      };

      simulateFileGeneration(dynamicFiles);
    }

    // Add a processing message to the chat
    setChatHistory((prev) => [
      ...prev,
      {
        role: "assistant" as const,
        content: isInitialCreation
          ? "I'm creating your web app with a beautiful design and proper structure..."
          : "I'm applying your changes while maintaining design consistency...",
        timestamp: new Date(),
      },
    ]);

    // Generate response
    try {
      // Prepare the prompt based on whether this is initial creation or a modification
      let enhancedPrompt = isInitialCreation
        ? createWebAppPrompt(
            currentPrompt,
            imageAttachment ? imageDesignPrompt : undefined
          )
        : modifyWebAppPrompt(
            currentPrompt,
            fileSystem.files
              .map(
                (file) =>
                  `File: ${file.path}\n\`\`\`${file.language}\n${file.content}\n\`\`\`\n`
              )
              .join("\n")
          );

      // Add specific instructions for code organization
      enhancedPrompt += `\n\nIMPORTANT INSTRUCTIONS FOR CODE STRUCTURE:
1. Create a modular, well-organized codebase. DO NOT put all code in a single App.tsx file.
2. Follow these organization principles:
   - Break UI into small, reusable components
   - Place components in appropriate folders (src/components/[ComponentName].tsx)
   - Extract business logic into custom hooks (src/hooks/use[HookName].ts)
   - Place types/interfaces in dedicated files (src/types/[Type].ts)
   - Create utility functions in separate files (src/utils/[util].ts)
   - Place API/data fetching logic in separate services (src/services/[service].ts)
   - Use proper folder structure for related components (e.g., src/components/layout/, src/components/ui/)
3. Each component should:
   - Follow single responsibility principle 
   - Be in its own file with proper naming
   - Have proper prop typing
   - Handle only its specific functionality
4. Always include a README.md that explains the application structure and component organization.
5. Remember to create proper routing if the app has multiple pages (using react-router-dom).`;

      // Add specific instructions about not using local assets
      enhancedPrompt += `\n\nCRITICAL INSTRUCTION ABOUT ASSETS:
1. NEVER use or reference local image files or assets (e.g., "../assets/image.png", "./images/logo.svg", "./reportWebVitals")
2. For images, ONLY use these specific working Unsplash URLs:
   - https://images.unsplash.com/photo-1682687982501-1e58ab814714?auto=format&fit=crop&w=1600&q=80
   - https://images.unsplash.com/photo-1680700536058-a435fe18be6e?auto=format&fit=crop&w=1600&q=80
   - https://images.unsplash.com/photo-1682686581295-7136dd801d70?auto=format&fit=crop&w=1600&q=80
   - https://images.unsplash.com/photo-1673187236927-a8ef13486aff?auto=format&fit=crop&w=1600&q=80
3. For icons, use ONLY:
   - Lucide React icons (import { Icon } from "lucide-react")
   - React Icons (import { IconName } from "react-icons/xx")
   - Heroicons (import { IconName } from "@heroicons/react/24/outline")
4. Any references to static files will cause build errors
5. Format image URLs properly as string literals in your JSX, not as import statements`;

      // Add strict instructions about including all necessary imports and dependencies
      enhancedPrompt += `\n\nSTRICT DEPENDENCY AND IMPORT REQUIREMENTS:
1. EVERY component and function you use MUST have a proper import statement
2. NEVER use a component, hook, or utility without importing it first
3. ALL libraries used must be included in the package.json dependencies
4. Include the full set of React imports needed: import React, { useState, useEffect, etc. } from "react"
5. For icon libraries (like lucide-react), import each specific icon: import { Icon1, Icon2 } from "lucide-react"
6. For utility functions, include their imports: import { cn } from "@/lib/utils"
7. For hooks, import them explicitly: import { useHook } from "library" or from custom hooks
8. NEVER reference a component that hasn't been imported in that specific file
9. When importing local components, use the correct relative paths: import { Button } from "./Button" or "../components/Button"
10. Import all external libraries exactly as they should be referenced in package.json`;

      // Add critical error prevention instructions
      enhancedPrompt += `\n\nCRITICAL ERROR PREVENTION:
1. If you include an import of reportWebVitals, you MUST create the reportWebVitals.js file. Here's the exact code:
\`\`\`
// filename: src/reportWebVitals.js
const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;
\`\`\`

2. ONLY use React version 18.2.0, never reference React 19 or higher in any imports
3. For ANY component that uses React hooks (especially useContext), add: import React from "react"
4. In index.tsx or index.js, always wrap <App /> in <React.StrictMode> tags
5. If you use Context API, create a complete context implementation with Provider and proper exports
6. Add web-vitals dependency in package.json if reportWebVitals is used`;

      // Generate response from Gemini AI
      const response = await generateWebApp(
        enhancedPrompt,
        imageAttachment || undefined
      );
      console.log("Raw response from API:", response);

      // Extract code blocks with filenames
      const newFiles: FileType[] = [];
      // Use a more comprehensive regex pattern that handles different variations of code block formatting
      const codeBlockRegex =
        /(?:\/\/\s*filename:\s*|filename:\s*|\/\/\s*File:\s*|File:\s*|\[\s*filename:\s*)([\w./-]+)(?:\s*\n|\s*\r\n|\s*\]\s*\n)```(?:jsx|tsx|js|ts|typescript|javascript|css|scss|less|html|json|md|markdown)?(?:\s*\n|\s*\r\n)([\s\S]*?)```/g;

      console.log(
        "Attempting to extract code blocks with regex:",
        codeBlockRegex
      );

      // If we don't detect any proper code blocks, try alternative formats
      if (!codeBlockRegex.test(response)) {
        console.log(
          "No code blocks with standard filename formatting detected, trying alternative patterns"
        );

        // Try another common pattern: code blocks followed by description lines mentioning filenames
        const filePattern =
          /```(?:jsx|tsx|js|ts|typescript|javascript|css|scss|less|html|json|md|markdown)?\s*\n([\s\S]*?)```\s*\n.*?(?:file|path|location|save).*?["`']([^"`'\n]+)["`']/gi;

        let fileMatch;
        while ((fileMatch = filePattern.exec(response)) !== null) {
          const [_, content, filename] = fileMatch;
          if (content && filename) {
            console.log(
              `Found code block with filename ${filename} using alternative pattern`
            );
            createFileFromContent(filename, content.trim());
          }
        }

        // Look for React component content that might be App.tsx
        const appComponentRegex =
          /import React.*?export (?:default |const |function )(?:App|Main|Home).*?(?:=>|\{)[\s\S]*?(?:<\/[\w.]+>|\})/g;
        const appMatch = appComponentRegex.exec(response);

        if (appMatch && appMatch[0]) {
          console.log(
            "Found potential App.tsx content without proper formatting"
          );
          createFileFromContent("src/App.tsx", appMatch[0]);
        }

        // Look for any code blocks without filenames and try to infer the filename
        const unnamedCodeBlocks = response.match(
          /```(?:jsx|tsx|js|ts|typescript|javascript|css|scss|less|html|json|md|markdown)?\s*\n([\s\S]*?)```/g
        );

        if (unnamedCodeBlocks && unnamedCodeBlocks.length > 0) {
          console.log(
            `Found ${unnamedCodeBlocks.length} unnamed code blocks, attempting to infer filenames`
          );

          // Process each unnamed code block
          unnamedCodeBlocks.forEach((block, index) => {
            // Use a workaround for the dotAll flag
            const content = block
              .replace(
                /```(?:jsx|tsx|js|ts|typescript|javascript|css|scss|less|html|json|md|markdown)?\s*\n/,
                ""
              )
              .replace(/```\s*$/, "")
              .trim();

            if (content) {
              // Infer filename based on content
              let inferredName = "";

              if (
                content.includes("export default App") ||
                content.includes("function App") ||
                content.includes("const App =")
              ) {
                inferredName = "src/App.tsx";
              } else if (
                content.includes("import React") &&
                content.includes("export")
              ) {
                // Check if it contains a component name we can use
                const componentNameMatch = content.match(
                  /(?:function|const)\s+(\w+)/
                );
                if (componentNameMatch && componentNameMatch[1]) {
                  inferredName = `src/components/${componentNameMatch[1]}.tsx`;
                } else {
                  inferredName = `src/components/Component${index + 1}.tsx`;
                }
              } else if (
                content.includes("html") ||
                content.includes("<body")
              ) {
                inferredName = "public/index.html";
              } else if (
                content.includes("@tailwind") ||
                content.includes("tailwindcss")
              ) {
                inferredName = "tailwind.config.js";
              } else if (
                content.includes("body {") ||
                content.includes(".container")
              ) {
                inferredName = "src/index.css";
              } else if (
                content.includes("dependencies") ||
                content.includes("devDependencies")
              ) {
                inferredName = "package.json";
              } else {
                // Generic fallback names based on content characteristics
                if (content.includes("import React")) {
                  inferredName = `src/components/Component${index + 1}.tsx`;
                } else if (content.includes("module.exports")) {
                  inferredName = `config${index + 1}.js`;
                } else if (content.includes("DOCTYPE html")) {
                  inferredName = `src/index.html`;
                } else {
                  inferredName = `src/file${index + 1}.js`;
                }
              }

              console.log(
                `Inferred filename ${inferredName} for unnamed code block ${
                  index + 1
                }`
              );
              createFileFromContent(inferredName, content);
            }
          });
        }

        // Notify the user about the issue
        toast({
          title: "File formatting issue detected",
          description:
            "The AI didn't format files properly. I've attempted to extract and organize the code.",
          variant: "destructive",
        });
      } else {
        // Reset the regex lastIndex to start from the beginning
        codeBlockRegex.lastIndex = 0;
      }

      // Helper function to create a file from content
      function createFileFromContent(filename: string, content: string) {
        // Process the content to detect language
        let language: "typescript" | "css" | "json" = "typescript"; // Default language

        // Determine language based on file extension
        if (filename.endsWith(".css")) language = "css";
        else if (filename.endsWith(".scss")) language = "css";
        else if (filename.endsWith(".less")) language = "css";
        else if (filename.endsWith(".json")) language = "json";
        else if (filename.endsWith(".md")) language = "json"; // Use json for markdown for syntax highlighting

        // Ensure the path starts with a leading slash
        const path = filename.startsWith("/") ? filename : `/${filename}`;
        const name = path.split("/").pop() || path;

        // Add file to newFiles array
        newFiles.push({
          id: uuidv4(),
          name,
          content,
          language,
          path,
        });

        // Add to generating files animation
        if (!generatingFiles.includes(filename)) {
          setGeneratingFiles((prev) => [...prev, filename]);
          setCurrentGeneratingFile(filename);
        }
      }

      // Create a set to track all imports
      const importRegex =
        /import\s+?(?:(?:{[^}]*}|\*|\w+)\s+from\s+)?['"]([@\w\-/.]+)['"]/g;
      const detectedDependencies = new Set<string>();

      // Default dependencies that should always be included
      const defaultDependencies: Record<string, string> = {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
        "@types/node": "^16.18.0",
        "@types/react": "^18.2.0",
        "@types/react-dom": "^18.2.0",
        typescript: "^4.9.5",
        tailwindcss: "^3.3.0",
        postcss: "^8.4.31",
        autoprefixer: "^10.4.16",
      };

      // Map of package names to their versions
      const dependencyVersions: Record<string, string> = {
        "@headlessui/react": "^1.7.17",
        "@heroicons/react": "^2.0.18",
        "lucide-react": "^0.294.0",
        clsx: "^2.0.0",
        "class-variance-authority": "^0.7.0",
        uuid: "^9.0.0",
        "@types/uuid": "^9.0.7",
        "date-fns": "^2.30.0",
        lodash: "^4.17.21",
        "@types/lodash": "^4.14.202",
        "react-hook-form": "^7.49.2",
        zod: "^3.22.4",
        "@hookform/resolvers": "^3.3.2",
        "framer-motion": "^10.16.16",
        zustand: "^4.4.7",
        jotai: "^2.6.0",
        axios: "^1.6.2",
        "@tanstack/react-query": "^5.14.2",
        "react-router-dom": "^6.21.0",
        recharts: "^2.10.3",
        "tailwindcss-animate": "^1.0.7",
        color: "^4.2.3",
        "@types/color": "^3.0.6",
      };

      let match;
      while ((match = codeBlockRegex.exec(response)) !== null) {
        const [_, filename, content] = match;
        if (filename && content) {
          console.log(`Found code block with filename: ${filename}`);
          createFileFromContent(filename, content.trim());

          // Extract imports from the file content
          let importMatch;
          while ((importMatch = importRegex.exec(content)) !== null) {
            const packageName = importMatch[1];
            // Only add if it's a package (not a relative import)
            if (!packageName.startsWith(".") && !packageName.startsWith("/")) {
              // Handle scoped packages and submodules
              const mainPackage = packageName.startsWith("@")
                ? packageName.split("/").slice(0, 2).join("/")
                : packageName.split("/")[0];
              detectedDependencies.add(mainPackage);
            } else if (packageName === "./reportWebVitals") {
              // Auto-generate reportWebVitals file when it's imported
              createFileFromContent(
                "src/reportWebVitals.js",
                AppTemplates.REPORT_WEB_VITALS
              );
              // Add web-vitals to dependencies
              detectedDependencies.add("web-vitals");
            }
          }
        }
      }

      // Create package.json content with detected dependencies
      const packageJson = {
        name: "web-app",
        version: "0.1.0",
        private: true,
        dependencies: {
          ...defaultDependencies,
          ...Object.fromEntries(
            Array.from(detectedDependencies)
              .filter((dep) => dependencyVersions[dep])
              .map((dep) => [dep, dependencyVersions[dep]])
          ),
          // Always include web-vitals to avoid errors
          "web-vitals": "^2.1.4",
        },
      };

      // Add package.json to the files
      newFiles.push({
        id: uuidv4(),
        name: "package.json",
        content: JSON.stringify(packageJson, null, 2),
        language: "json",
        path: "/package.json",
      });

      console.log("Generated files:", newFiles);

      if (newFiles.length === 0) {
        throw new Error(
          "No valid files were generated. Please try again with a different prompt."
        );
      }

      // Merge new files with existing files or create new ones
      let updatedFiles: FileType[] = [];
      let newFilesCount = 0;
      let modifiedFilesCount = 0;

      if (isInitialCreation) {
        // First time creation - use the new files directly
        updatedFiles = newFiles;
        newFilesCount = newFiles.length;
      } else {
        // Merge with existing files
        const existingFiles = [...fileSystem.files];

        // Process each new file
        for (const newFile of newFiles) {
          // Check if the file already exists
          const existingFileIndex = existingFiles.findIndex(
            (f) => f.path === newFile.path
          );

          if (existingFileIndex >= 0) {
            // Update existing file
            existingFiles[existingFileIndex] = {
              ...existingFiles[existingFileIndex],
              content: newFile.content,
            };
            modifiedFilesCount++;
          } else {
            // Add new file
            existingFiles.push(newFile);
            newFilesCount++;
          }
        }

        updatedFiles = existingFiles;
      }

      // Update file system state
      setFileSystem({
        files: updatedFiles,
        activeFileId: null,
      });

      // Force refresh the StackBlitz editor
      setPreviewKey((prev) => prev + 1);

      // Update chat history with success message
      setChatHistory((prev) => {
        const newHistory = [...prev];
        newHistory.pop(); // Remove the processing message

        return [
          ...newHistory,
          {
            role: "assistant" as const,
            content: isInitialCreation
              ? `I've created your web app! It has ${newFiles.length} files. You can edit the code directly in the integrated editor.`
              : `I've updated your web app with the changes you requested. ${modifiedFilesCount} files were modified and ${newFilesCount} new files were added.`,
            timestamp: new Date(),
          },
        ];
      });

      // Clear the prompt after successful generation
      setPrompt("");

      toast({
        title: isInitialCreation
          ? "Web app created successfully"
          : "Web app updated successfully",
        description: isInitialCreation
          ? `Created ${newFiles.length} files.`
          : `Modified ${modifiedFilesCount} files and added ${newFilesCount} new files.`,
      });

      // Clear generating files animations
      setGeneratingFiles([]);
      setCurrentGeneratingFile(null);
    } catch (error) {
      console.error("Error generating web app:", error);
      setError(
        `Error generating web app: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );

      // Replace the processing message with the error message
      setChatHistory((prev) => {
        const newHistory = [...prev];
        newHistory.pop(); // Remove the processing message

        return [
          ...newHistory,
          {
            role: "assistant" as const,
            content: `Error: ${
              error instanceof Error ? error.message : "Unknown error"
            }. Please try again with a different prompt.`,
            timestamp: new Date(),
          },
        ];
      });
    } finally {
      setIsGenerating(false);
      setGeneratingFiles([]);
      setCurrentGeneratingFile(null);
    }
  };

  // Function to compile files for preview
  const compileFiles = useCallback(() => {
    if (!fileSystem.files.length) return "";

    // Prepare files for StackBlitz in the correct format
    const projectFiles: Record<string, string> = {};

    // Process all files
    fileSystem.files.forEach((file) => {
      // Normalize path - remove leading slash and ensure proper structure
      let filePath = file.path.startsWith("/")
        ? file.path.substring(1)
        : file.path;

      // For any code files not in src/ or specific config files, place them in src/
      if (
        !filePath.startsWith("src/") &&
        !filePath.match(
          /^(package\.json|tailwind\.config\.js|postcss\.config\.js|tsconfig\.json|public\/.*|README\.md)$/
        )
      ) {
        filePath = `src/${filePath}`;
      }

      // Add file to project with correct format
      projectFiles[filePath] = file.content;
    });

    // Ensure we have essential files
    if (!projectFiles["src/index.tsx"] && !projectFiles["src/index.js"]) {
      projectFiles["src/index.tsx"] = AppTemplates.INDEX_JS;
    }

    // Add reportWebVitals if it doesn't exist but is referenced
    const hasReportWebVitalsImport = Object.values(projectFiles).some(
      (fileContent) =>
        fileContent.includes("import reportWebVitals from") ||
        fileContent.includes("import reportWebVitals from")
    );

    if (hasReportWebVitalsImport && !projectFiles["src/reportWebVitals.js"]) {
      projectFiles["src/reportWebVitals.js"] = AppTemplates.REPORT_WEB_VITALS;
    }

    // Add index.css if it doesn't exist
    if (!projectFiles["src/index.css"]) {
      projectFiles["src/index.css"] = AppTemplates.INDEX_CSS;
    }

    // Add index.html if it doesn't exist
    if (!projectFiles["public/index.html"]) {
      projectFiles["public/index.html"] = AppTemplates.INDEX_HTML;
    }

    // Add tailwind.config.js if it doesn't exist
    if (!projectFiles["tailwind.config.js"]) {
      projectFiles["tailwind.config.js"] = AppTemplates.TAILWIND_CONFIG;
    }

    // Add postcss.config.js if it doesn't exist
    if (!projectFiles["postcss.config.js"]) {
      projectFiles["postcss.config.js"] = AppTemplates.POSTCSS_CONFIG;
    }

    // Add package.json if it doesn't exist
    if (!projectFiles["package.json"]) {
      projectFiles["package.json"] = AppTemplates.PACKAGE_JSON;
    }

    // Special handling for React errors - ensure compatibility
    // Replace any React 19 references with React 18
    Object.keys(projectFiles).forEach((filePath) => {
      // Fix React import versions in all files
      if (
        filePath.endsWith(".tsx") ||
        filePath.endsWith(".jsx") ||
        filePath.endsWith(".ts") ||
        filePath.endsWith(".js")
      ) {
        // Replace React 19 imports with React 18
        projectFiles[filePath] = projectFiles[filePath]
          .replace(/from ['"]react@19[\d.]+['"]/g, 'from "react"')
          .replace(/from ['"]react-dom@19[\d.]+['"]/g, 'from "react-dom"');

        // Add extra safeguards for useContext issues
        if (
          projectFiles[filePath].includes("useContext") &&
          !projectFiles[filePath].includes("import React")
        ) {
          // Make sure React is imported if useContext is used
          projectFiles[
            filePath
          ] = `import React from 'react';\n${projectFiles[filePath]}`;
        }
      }
    });

    // Log the files we're sending to the editor for debugging
    console.log("Files being sent to editor:", Object.keys(projectFiles));

    // Create project directly with our files
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Web App Preview</title>
          <script src="https://unpkg.com/@stackblitz/sdk@1/bundles/sdk.umd.js"></script>
          <style>
            body, html { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; }
            .loading { 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              font-family: system-ui, -apple-system, sans-serif;
            }
            .spinner {
              width: 40px;
              height: 40px;
              border: 3px solid rgba(55, 125, 255, 0.2);
              border-radius: 50%;
              border-top-color: rgb(55, 125, 255);
              animation: spin 1s ease-in-out infinite;
              margin-bottom: 16px;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            #embed { height: 100vh; width: 100%; border: none; }
            
            /* Custom styles for editor */
            :root {
              --ring-color: rgb(59 130 246);
            }
            
            /* Hide unnecessary elements */
            .ProjectTitleBar-module_container__*,
            .EditorFooter-module_container__*,
            .StatusBar-module_container__*,
            [class*="StatusBar"],
            [class*="EditorFooter"],
            [class*="ProjectTitleBar"] { 
              display: none !important; 
            }
            
            /* Custom overlay for StackBlitz logo */
            .StackBlitzLogo {
              position: relative;
            }
            
            .StackBlitzLogo::after {
              content: "";
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 100;
            }
            
            /* Additional style to ensure the logo is hidden */
            [class*="StackBlitzLogo"] img {
              opacity: 0;
            }
            
            /* Additional styles to force hide bottom elements */
            .ViewPort-module_container__* {
              padding-bottom: 0 !important;
            }
            
            .Editor-module_container__* {
              margin-bottom: 0 !important;
            }
            
            /* Ensure no space is reserved for hidden elements */
            .Layout-module_container__* {
              grid-template-rows: 1fr !important;
            }
            
            /* Move editor tabs to top */
            .ViewPort-module_container__* {
              display: flex !important;
              flex-direction: column !important;
            }
            
            .ViewPort-module_editors__* {
              order: 1 !important;
            }
            
            .ViewPort-module_preview__* {
              order: 2 !important;
            }
            
            /* Style the editor/preview tabs */
            .TabList-module_container__* {
              background: #1a1a1a !important;
              border-bottom: 1px solid #2d2d2d !important;
              padding: 8px 16px !important;
            }
            
            .Tab-module_container__* {
              color: #e5e5e5 !important;
              font-size: 14px !important;
              padding: 6px 12px !important;
              border-radius: 6px !important;
            }
            
            .Tab-module_container__*:hover {
              background: rgba(255, 255, 255, 0.1) !important;
            }
            
            .Tab-module_selected__* {
              background: var(--ring-color) !important;
              color: white !important;
            }
            
            /* Company logo in bottom left of preview */
            .bk-company-logo {
              position: fixed;
              bottom: 0;
              left: 16px;
              height: 40px;
              z-index: 9999;
              font-weight: bold;
              font-size: 14px;
              background: linear-gradient(to right, #3B82F6, #8B5CF6);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              text-shadow: 0 1px 2px rgba(0,0,0,0.1);
              pointer-events: none;
              font-family: system-ui, -apple-system, sans-serif;
              padding: 0;
              display: flex;
              align-items: center;
            }
            
            /* Override StackBlitz editor bottom bar */
            .__stk-bottom_bar {
              background-color: #242424 !important;
            }
          </style>
        </head>
        <body>
          <div id="embed">
            <div class="loading">
              <div class="spinner"></div>
              <p>Loading editor...</p>
            </div>
          </div>

          <script>
            // Notify parent window that preview is loading
            if (window.parent) {
              window.parent.postMessage('preview-loading', '*');
            }

            document.addEventListener('DOMContentLoaded', function() {
              try {
                const sdk = StackBlitzSDK;
                if (!sdk) {
                  throw new Error('Editor SDK failed to load');
                }

                // Add company logo to bottom left
                // const companyLogo = document.createElement('div');
                // companyLogo.className = 'bk-company-logo';
                // companyLogo.textContent = 'BK ZenVibe';
                // document.body.appendChild(companyLogo);
                
                // Use MutationObserver to detect when the bottom bar is added
                const observer = new MutationObserver((mutations) => {
                  const bottomBar = document.querySelector('.__stk-bottom_bar');
                  if (bottomBar) {
                    // Clean up any existing logos that might have been added to the document body
                    document.querySelectorAll('.bk-company-logo').forEach(logo => {
                      if (logo !== companyLogo) {
                        logo.remove();
                      }
                    });
                    
                    // Move our logo to the bottom bar
                    if (companyLogo.parentElement !== bottomBar) {
                      bottomBar.appendChild(companyLogo);
                    }
                    
                    // Disconnect once we've found and updated the logo
                    observer.disconnect();
                  }
                });
                
                // Start observing the document for changes
                observer.observe(document.body, { 
                  childList: true, 
                  subtree: true 
                });

                // Create project with our files
                sdk.embedProject(
                  'embed',
                  {
                    title: 'Web App',
                    description: 'Web App with Modern UI',
                    template: 'create-react-app',
                    files: ${JSON.stringify(projectFiles)},
                    dependencies: {
                      // React and core dependencies - lock to stable versions
                      "react": "^18.2.0", // Use stable version 18 instead of 19
                      "react-dom": "^18.2.0",
                      "@types/node": "^16.18.0",
                      "@types/react": "^18.2.0",
                      "@types/react-dom": "^18.2.0",
                      "typescript": "^4.9.5",
                      
                      // Add web-vitals to avoid errors with reportWebVitals
                      "web-vitals": "^2.1.4",
                      
                      // Styling dependencies
                      "tailwindcss": "^3.3.0",
                      "postcss": "^8.4.31",
                      "autoprefixer": "^10.4.16",
                      
                      // Common UI libraries
                      "@headlessui/react": "^1.7.17",
                      "@heroicons/react": "^2.0.18",
                      "lucide-react": "^0.294.0",
                      "clsx": "^2.0.0",
                      "class-variance-authority": "^0.7.0",
                      
                      // Utilities
                      "uuid": "^9.0.0",
                      "@types/uuid": "^9.0.7",
                      "date-fns": "^2.30.0",
                      "lodash": "^4.17.21",
                      "@types/lodash": "^4.14.202",
                      
                      // Form handling
                      "react-hook-form": "^7.49.2",
                      "zod": "^3.22.4",
                      "@hookform/resolvers": "^3.3.2",
                      
                      // Animation
                      "framer-motion": "^10.16.16",
                      
                      // State management
                      "zustand": "^4.4.7",
                      "jotai": "^2.6.0",
                      
                      // Data fetching
                      "axios": "^1.6.2",
                      "@tanstack/react-query": "^5.14.2",
                      
                      // Routing
                      "react-router-dom": "^6.21.0",
                      
                      // Charts and visualization
                      "recharts": "^2.10.3",
                      
                      // Colors and themes
                      "tailwindcss-animate": "^1.0.7",
                      "color": "^4.2.3",
                      "@types/color": "^3.0.6"
                    },
                    settings: {
                      compile: {
                        clearConsole: false,
                        trigger: 'auto'
                      }
                    }
                  },
                  {
                    openFile: 'src/App.tsx',
                    layout: 'preview',
                    hideNavigation: true,
                    hideDevTools: true,
                    hideExplorer: false,
                    showSidebar: false,
                    devToolsHeight: 0,
                    forceEmbedLayout: true,
                    theme: 'dark',
                    clickToLoad: false,
                    view: 'preview',
                    showCustomDevTools: false
                  }
                ).then(vm => {
                  console.log('Editor VM ready');
                  // Notify parent when preview is loaded
                  if (window.parent) {
                    window.parent.postMessage('preview-loaded', '*');
                  }
                }).catch(err => {
                  console.error('Failed to create editor project:', err);
                  document.getElementById('embed').innerHTML = 
                    '<div style="padding: 20px; font-family: system-ui; color: #333;">' +
                    '<h2 style="color: #e53e3e;">Editor Error</h2>' +
                    '<p>' + err.toString() + '</p>' +
                    '<p>Please check the console for more details.</p>' +
                    '</div>';
                  
                  if (window.parent) {
                    window.parent.postMessage('preview-loaded', '*');
                  }
                });
              } catch (err) {
                console.error('Error initializing editor:', err);
                document.getElementById('embed').innerHTML = 
                  '<div style="padding: 20px; font-family: system-ui; color: #333;">' +
                  '<h2 style="color: #e53e3e;">Editor Error</h2>' +
                  '<p>' + err.toString() + '</p>' +
                  '<p>Please check your network connection and try again.</p>' +
                  '</div>';
                
                if (window.parent) {
                  window.parent.postMessage('preview-loaded', '*');
                }
              }
            });
          </script>
        </body>
      </html>`;
  }, [fileSystem.files]);

  // Function to handle preview load
  const handlePreviewLoad = useCallback(() => {
    console.log("Preview iframe loaded!");
    setIsPreviewLoading(false);
  }, []);

  return (
    <div className='min-h-screen bg-[#0D0D0D]'>
      {fileSystem.files.length === 0 ? (
        // Initial state - chat interface with welcome message
        <div className='min-h-screen flex flex-col overflow-auto'>
          {/* Background gradient and patterns - fixed position to cover entire viewport */}
          <div className='fixed inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/5 to-pink-600/10 w-screen h-screen z-0' />
          <div className='fixed inset-0 bg-[url("/grid.svg")] opacity-20 w-screen h-screen z-0' />

          {/* Particle effect - using fixed position to ensure full coverage */}
          <div className='fixed inset-0 w-screen h-screen overflow-hidden z-0'>
            {particles.map((particle, i) => (
              <motion.div
                key={i}
                className='absolute rounded-full'
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  backgroundColor: particle.color,
                  filter: "blur(1px)",
                  opacity: 0.6,
                }}
                // Simplify animation to reduce lag
                initial={{ opacity: 0.4 }}
                animate={{ opacity: 0.7 }}
                transition={{
                  duration: 2 + Math.random() * 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatType: "reverse",
                }}
              />
            ))}
          </div>

          {/* Animated background elements */}
          <div className='fixed inset-0 w-screen h-screen z-0'>
            <div className='absolute top-0 -left-4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10' />
            <div className='absolute top-0 -right-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10' />
            <div className='absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10' />
          </div>

          {/* Content container - relative positioning to appear above fixed backgrounds */}
          <div className='w-full max-w-3xl mx-auto flex flex-col relative z-10 min-h-screen py-10 overflow-y-auto px-4'>
            <div className='flex-1 flex items-start justify-center mt-10 p-4'>
              <div className='w-full max-w-2xl space-y-8 pb-20'>
                {/* Header with animated icon */}
                <div className='text-center space-y-5'>
                  <motion.div
                    className='inline-block'
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  >
                    <div className='flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-[1px] mb-4 mx-auto overflow-hidden group'>
                      <div className='flex items-center justify-center w-full h-full bg-[#1A1A1A] rounded-2xl relative'>
                        <div className='absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100' />

                        {/* Animated floating icons around logo */}
                        <div className='absolute inset-0'>
                          {[
                            "rgba(59, 130, 246, 0.7)",
                            "rgba(139, 92, 246, 0.7)",
                            "rgba(236, 72, 153, 0.7)",
                          ].map((color, i) => (
                            <div
                              key={i}
                              className='absolute w-2.5 h-2.5 rounded-full'
                              style={{
                                backgroundColor: color,
                                top: "50%",
                                left: "50%",
                                transform: `translate(-50%, -50%) translate(${
                                  Math.cos((i * Math.PI * 2) / 3) * 30
                                }px, ${
                                  Math.sin((i * Math.PI * 2) / 3) * 30
                                }px)`,
                                opacity: 0.7,
                              }}
                            />
                          ))}
                        </div>

                        <div className='relative'>
                          <FileCode className='w-10 h-10 text-blue-500' />
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <div className='relative'>
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.6,
                        delay: 0.2,
                        ease: "easeOut",
                      }}
                    >
                      <h2 className='text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 tracking-tight'>
                        BK GenVibe
                      </h2>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.6,
                        delay: 0.3,
                        ease: "easeOut",
                      }}
                      className='text-center mt-2'
                    >
                      <h3 className='text-2xl font-medium text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-400 tracking-tight'>
                        Create Your Web App
                      </h3>
                    </motion.div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                  >
                    <p className='text-gray-400 text-sm mx-auto max-w-md'>
                      Describe your web app idea or upload a reference image to
                      get started with our AI-powered app builder
                    </p>
                  </motion.div>
                </div>

                {/* Input card with animations */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
                >
                  <div className='bg-[#1A1A1A] rounded-2xl border border-gray-800/50 backdrop-blur-xl shadow-2xl overflow-hidden'>
                    {/* Code typing animation */}
                    {!prompt && !isGenerating && !imageAttachment && (
                      <div className='absolute top-6 left-6 text-sm text-gray-500/50 font-mono overflow-hidden z-10'>
                        <motion.div
                          animate={{
                            opacity: [0.3, 0.5, 0.3],
                          }}
                          transition={{
                            duration: 4,
                            repeat: Infinity,
                          }}
                        >
                          {typedCode}
                          <motion.span
                            animate={{ opacity: [1, 0, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className='inline-block w-2 h-4 bg-blue-500/50 ml-0.5'
                          ></motion.span>
                        </motion.div>
                      </div>
                    )}

                    <div className='relative'>
                      <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder='Describe your dream web app with all the details you want...'
                        className='min-h-[180px] bg-transparent border-0 focus:ring-0 focus:outline-none text-gray-200 placeholder-gray-500/70 p-6 resize-none text-sm leading-relaxed'
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <motion.div
                        className='absolute bottom-2 right-4 text-xs text-gray-500'
                        animate={{
                          opacity: [0.6, 1, 0.6],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        Pro tip: Be specific about colors, layout, and
                        interactions
                      </motion.div>
                    </div>

                    {/* Image Attachment Preview with enhanced animations */}
                    {imageAttachment && (
                      <div className='px-6 pb-4 border-t border-gray-800/50'>
                        <div className='flex items-center mt-4 mb-2'>
                          <motion.span
                            className='text-xs font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-1'
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <Sparkles className='w-3 h-3 text-blue-400' />
                            REFERENCE DESIGN
                          </motion.span>
                        </div>
                        <motion.div
                          className='relative w-full max-w-[200px] aspect-video rounded-xl overflow-hidden bg-gray-800/50 group'
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4 }}
                          whileHover={{ scale: 1.05 }}
                        >
                          <img
                            src={imageAttachment}
                            alt='Reference'
                            className='w-full h-full object-cover transition-transform group-hover:scale-105'
                          />
                          <motion.div
                            className='absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent opacity-0 group-hover:opacity-100'
                            transition={{ duration: 0.3 }}
                            whileHover={{
                              backdropFilter: "blur(2px)",
                              boxShadow: "inset 0 -20px 20px rgba(0,0,0,0.3)",
                            }}
                          />
                          <motion.button
                            onClick={() => setImageAttachment(null)}
                            className='absolute top-2 right-2 p-1.5 rounded-full bg-gray-900/80 text-gray-400 hover:text-white transition-colors backdrop-blur-sm'
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <X className='w-5 h-5' />
                          </motion.button>
                          <motion.div
                            className='absolute bottom-2 left-2 text-xs text-gray-300 opacity-0 group-hover:opacity-100 bg-gray-900/30 backdrop-blur-sm px-2 py-0.5 rounded-md'
                            initial={{ y: 10, opacity: 0 }}
                            whileHover={{ y: 0, opacity: 1 }}
                          >
                            {imageAttachment
                              .substring(0, 30)
                              .includes("image/png")
                              ? "PNG Image"
                              : imageAttachment
                                  .substring(0, 30)
                                  .includes("image/jpeg")
                              ? "JPEG Image"
                              : imageAttachment
                                  .substring(0, 30)
                                  .includes("image/webp")
                              ? "WebP Image"
                              : "Image"}
                          </motion.div>

                          {/* Corner highlight animation */}
                          <motion.div
                            className='absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none'
                            animate={{
                              background: [
                                "linear-gradient(135deg, rgba(59, 130, 246, 0) 0%, rgba(59, 130, 246, 0) 50%, rgba(59, 130, 246, 0.3) 50%, rgba(59, 130, 246, 0) 55%)",
                                "linear-gradient(135deg, rgba(59, 130, 246, 0) 100%, rgba(59, 130, 246, 0) 100%, rgba(59, 130, 246, 0.3) 100%, rgba(59, 130, 246, 0) 100%)",
                              ],
                            }}
                            transition={{
                              duration: 2,
                              ease: "easeOut",
                              repeat: Infinity,
                              repeatDelay: 5,
                            }}
                          />
                        </motion.div>
                      </div>
                    )}

                    {/* Action buttons with animations */}
                    <div className='flex items-center gap-3 p-4 border-t border-gray-800/50'>
                      <div>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='text-gray-400 hover:text-gray-300 focus:outline-none rounded-xl px-4 h-11 group relative'
                          onClick={() =>
                            document.getElementById("image-upload")?.click()
                          }
                        >
                          <input
                            type='file'
                            id='image-upload'
                            className='hidden'
                            accept='image/*'
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(file);
                              }
                            }}
                          />
                          <div className='flex items-center gap-2'>
                            <Image className='w-5 h-5 group-hover:scale-110 transition-transform text-blue-400' />
                            <span>Attach Design</span>
                          </div>
                          <span className='absolute top-0 right-0 transform -translate-y-1/2 translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-[10px] font-bold text-white ring-2 ring-gray-900 transition-opacity duration-300 opacity-0 group-hover:opacity-100'>
                            UI
                          </span>
                        </Button>
                      </div>
                      <div className='flex-1'></div>
                      <div>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='text-gray-400 hover:text-gray-300 focus:outline-none rounded-xl px-4 h-11'
                        >
                          <div className='flex items-center gap-2'>
                            <Globe className='w-5 h-5 text-purple-400' />
                            <span>Public</span>
                          </div>
                        </Button>
                      </div>
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.7 }}
                      >
                        <Button
                          onClick={handleSendMessage}
                          disabled={isGenerating || !prompt.trim()}
                          className='w-11 h-11 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white transition-all hover:shadow-lg hover:shadow-blue-500/20 flex items-center justify-center focus:outline-none disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none'
                        >
                          {isGenerating ? (
                            <Loader2 className='h-6 w-6 animate-spin' />
                          ) : (
                            <ArrowUp className='w-6 h-6' />
                          )}
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>

                {/* File Generation Animation Section - Moved to bottom of page */}
                {isGenerating && generatingFiles.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className='mt-4 bg-[#1A1A1A] rounded-xl border border-gray-800/50 backdrop-blur-xl shadow-xl overflow-hidden max-h-[300px] flex flex-col'
                  >
                    <div className='px-6 py-4 bg-gray-900/50 flex-shrink-0'>
                      <div className='flex items-center mb-3'>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className='mr-2'
                        >
                          <Loader2 className='w-4 h-4 text-blue-400' />
                        </motion.div>
                        <motion.span
                          className='text-xs font-medium text-blue-400'
                          animate={{
                            opacity: [0.8, 1, 0.8],
                            scale: [0.98, 1, 0.98],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        >
                          GENERATING FILES
                        </motion.span>
                      </div>

                      {/* Current file being generated */}
                      {currentGeneratingFile && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className='mb-3 flex items-center text-blue-300 bg-blue-500/10 px-2 py-1 rounded-md'
                        >
                          <FileCode className='w-3 h-3 mr-2' />
                          <span className='text-xs'>
                            {currentGeneratingFile}
                          </span>
                        </motion.div>
                      )}
                    </div>

                    <div className='space-y-3 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent flex-1'>
                      {placeholderData.map((item, i) => (
                        <div key={i} className='flex flex-col space-y-1'>
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center'>
                              {item.type === "component" ? (
                                <Layers className='w-3 h-3 text-purple-400 mr-2' />
                              ) : item.type === "style" ? (
                                <Palette className='w-3 h-3 text-blue-400 mr-2' />
                              ) : (
                                <Code className='w-3 h-3 text-yellow-400 mr-2' />
                              )}
                              <span className='text-xs text-gray-300'>
                                {item.name}
                              </span>
                            </div>
                            <span className='text-xs text-gray-500'>
                              {Math.round(item.progress)}%
                            </span>
                          </div>
                          <motion.div
                            className='h-1 bg-gray-800 rounded-full overflow-hidden'
                            initial={{ opacity: 0.5 }}
                            animate={{ opacity: 1 }}
                          >
                            <motion.div
                              className='h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full'
                              style={{ width: `${item.progress}%` }}
                              animate={{
                                width: `${item.progress}%`,
                                boxShadow:
                                  item.progress > 90
                                    ? "0 0 8px rgba(139, 92, 246, 0.5)"
                                    : "none",
                              }}
                              transition={{ duration: 0.3 }}
                            />
                          </motion.div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Analysis view (when not yet generating files) */}
                {isGenerating && generatingFiles.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className='mt-4 bg-[#1A1A1A] rounded-xl border border-gray-800/50 backdrop-blur-xl shadow-xl overflow-hidden max-h-[300px] flex flex-col'
                  >
                    <div className='px-6 py-4 bg-gray-900/50'>
                      <div className='flex items-center mb-3'>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className='mr-2'
                        >
                          <Loader2 className='w-4 h-4 text-blue-400' />
                        </motion.div>
                        <motion.span
                          className='text-xs font-medium text-blue-400'
                          animate={{
                            opacity: [0.8, 1, 0.8],
                            scale: [0.98, 1, 0.98],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        >
                          ANALYZING YOUR REQUEST
                        </motion.span>
                      </div>
                      <div className='space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent'>
                        {/* Analysis animation */}
                        <div className='flex flex-col space-y-2'>
                          <motion.div
                            className='h-2 bg-gray-800 rounded-full w-full'
                            animate={{
                              background: [
                                "linear-gradient(90deg, #1E293B 0%, #334155 50%, #1E293B 100%)",
                                "linear-gradient(90deg, #1E293B 100%, #334155 100%, #1E293B 100%)",
                              ],
                              backgroundSize: ["200% 100%", "200% 100%"],
                              backgroundPosition: ["0% 0%", "200% 0%"],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          />
                          <motion.div
                            className='h-2 bg-gray-800 rounded-full'
                            style={{ width: "85%" }}
                            animate={{
                              background: [
                                "linear-gradient(90deg, #1E293B 0%, #334155 50%, #1E293B 100%)",
                                "linear-gradient(90deg, #1E293B 100%, #334155 100%, #1E293B 100%)",
                              ],
                              backgroundSize: ["200% 100%", "200% 100%"],
                              backgroundPosition: ["0% 0%", "200% 0%"],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "linear",
                              delay: 0.1,
                            }}
                          />
                          <motion.div
                            className='h-2 bg-gray-800 rounded-full'
                            style={{ width: "60%" }}
                            animate={{
                              background: [
                                "linear-gradient(90deg, #1E293B 0%, #334155 50%, #1E293B 100%)",
                                "linear-gradient(90deg, #1E293B 100%, #334155 100%, #1E293B 100%)",
                              ],
                              backgroundSize: ["200% 100%", "200% 100%"],
                              backgroundPosition: ["0% 0%", "200% 0%"],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "linear",
                              delay: 0.2,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Features section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.7, ease: "easeOut" }}
                  className='pt-6'
                >
                  <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
                    {[
                      {
                        icon: <FileCode className='w-4 h-4 text-blue-400' />,
                        title: "React Components",
                      },
                      {
                        icon: <Globe className='w-4 h-4 text-purple-400' />,
                        title: "Modern UI",
                      },
                      {
                        icon: (
                          <div className='w-4 h-4 flex items-center justify-center'>
                            <span className='text-xs text-yellow-400'>
                              {"</>"}
                            </span>
                          </div>
                        ),
                        title: "TypeScript",
                      },
                      {
                        icon: <Sparkles className='w-4 h-4 text-pink-400' />,
                        title: "AI Powered",
                      },
                    ].map((feature, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.8 + i * 0.1 }}
                        className='bg-gray-800/20 backdrop-blur rounded-xl p-3 border border-gray-800/30'
                        whileHover={{
                          backgroundColor: "rgba(59, 130, 246, 0.05)",
                          borderColor: "rgba(59, 130, 246, 0.2)",
                        }}
                      >
                        <div className='flex items-center gap-2'>
                          {feature.icon}
                          <span className='text-xs text-gray-400'>
                            {feature.title}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // App builder interface with StackBlitz editor
        <div className='flex min-h-screen h-full flex-col md:flex-row bg-gradient-to-br from-gray-900 via-gray-950 to-black overflow-hidden'>
          {/* Chat sidebar - full width on mobile, 1/3 width on desktop */}
          <div className='w-full md:w-1/3 border-b md:border-b-0 md:border-r border-gray-800/70 flex flex-col h-1/2 md:h-screen bg-gray-950/80 backdrop-blur-sm'>
            <div className='p-3 border-b border-gray-800/80 flex items-center justify-between bg-gray-900/30 backdrop-blur-sm'>
              <Link
                href='/'
                className='flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors'
              >
                <motion.div whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}>
                  <ArrowLeft className='w-5 h-5' />
                </motion.div>
                <span>Back</span>
              </Link>
              <h3 className='text-sm font-medium text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400'>
                AI Chat
              </h3>
              <Button
                variant='ghost'
                size='icon'
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className='rounded-full h-8 w-8 text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              >
                {theme === "dark" ? (
                  <Sun className='h-4 w-4' />
                ) : (
                  <Moon className='h-4 w-4' />
                )}
              </Button>
            </div>

            {/* Chat Messages */}
            <div
              className='flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent'
              ref={chatContainerRef}
            >
              {chatHistory.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={cn(
                    "flex items-start gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className='w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/10'>
                      <FileCode className='h-4 w-4 text-white' />
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex flex-col max-w-[85%] rounded-2xl p-4 text-sm shadow-md",
                      message.role === "user"
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white ml-auto"
                        : "bg-gray-800/70 text-gray-200 border border-gray-700/50 backdrop-blur-sm"
                    )}
                  >
                    <div className='break-words whitespace-pre-wrap'>
                      {message.content}
                    </div>
                    <div
                      className={cn(
                        "text-xs mt-2",
                        message.role === "user"
                          ? "text-blue-200/70 self-end"
                          : "text-gray-400 self-start"
                      )}
                    >
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                  {message.role === "user" && (
                    <div className='w-8 h-8 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center'>
                      <User className='h-4 w-4 text-blue-500' />
                    </div>
                  )}
                </motion.div>
              ))}
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className='flex items-start gap-3'
                >
                  <div className='w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/10'>
                    <FileCode className='h-4 w-4 text-white' />
                  </div>
                  <div className='bg-gray-800/70 text-gray-200 rounded-2xl p-4 text-sm max-w-[85%] border border-gray-700/50 backdrop-blur-sm shadow-md'>
                    <div className='flex items-center gap-3'>
                      <div className='flex space-x-1'>
                        <motion.div
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            repeatType: "loop",
                            times: [0, 0.5, 1],
                          }}
                          className='w-2 h-2 rounded-full bg-blue-400'
                        />
                        <motion.div
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{
                            duration: 1.2,
                            delay: 0.4,
                            repeat: Infinity,
                            repeatType: "loop",
                            times: [0, 0.5, 1],
                          }}
                          className='w-2 h-2 rounded-full bg-blue-400'
                        />
                        <motion.div
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{
                            duration: 1.2,
                            delay: 0.8,
                            repeat: Infinity,
                            repeatType: "loop",
                            times: [0, 0.5, 1],
                          }}
                          className='w-2 h-2 rounded-full bg-blue-400'
                        />
                      </div>
                      <span>Generating your code...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Chat Input */}
            <div className='p-4 border-t border-gray-800/50 bg-gray-900/30 backdrop-blur-sm'>
              <div className='flex flex-col space-y-4'>
                <div className='relative'>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder='Ask BK Gen Vibe to modify the app...'
                    className='bg-gray-800/50 border border-gray-700/50 rounded-xl placeholder-gray-500/70 text-gray-200 resize-none min-h-[160px] focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 text-sm leading-relaxed'
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <motion.div
                    className='absolute bottom-3 right-3 text-xs text-gray-500/80 px-2 py-1 rounded-md bg-gray-800/50 backdrop-blur-sm'
                    animate={{
                      opacity: [0.7, 1, 0.7],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    Press Enter to send
                  </motion.div>
                </div>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='flex-shrink-0 border-gray-700/50 text-gray-400 hover:text-blue-400 hover:border-blue-500/50 bg-gray-800/30'
                    onClick={() => setImageAttachment(null)}
                  >
                    <RefreshCw className='w-4 h-4 mr-2' />
                    Reset
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    disabled={isGenerating || !prompt.trim()}
                    className='w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-colors shadow-md shadow-blue-500/10'
                  >
                    {isGenerating ? (
                      <div className='flex items-center justify-center gap-2'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        <span>Generating...</span>
                      </div>
                    ) : (
                      <motion.div
                        className='flex items-center gap-2'
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <ArrowUp className='w-4 h-4' />
                        <span>Send</span>
                      </motion.div>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Editor */}
          <div className='flex-1 relative h-1/2 md:h-screen overflow-hidden'>
            {isPreviewLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className='absolute inset-0 flex items-center justify-center bg-gray-900/90 z-10 backdrop-blur-sm'
              >
                <div className='flex flex-col items-center gap-4 px-6 py-8 rounded-2xl bg-gray-800/50 border border-gray-700/50 backdrop-blur-md shadow-xl'>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Loader2 className='h-8 w-8 text-blue-500' />
                  </motion.div>
                  <div className='space-y-2 text-center'>
                    <h3 className='text-lg font-medium text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400'>
                      Initializing Editor
                    </h3>
                    <p className='text-sm text-gray-400 max-w-xs'>
                      Setting up your development environment with all generated
                      files
                    </p>
                  </div>
                  <div className='w-full max-w-xs bg-gray-900/50 rounded-full h-1.5 mt-2 overflow-hidden'>
                    <motion.div
                      className='h-full bg-gradient-to-r from-blue-500 to-purple-500'
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        repeatType: "loop",
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
            <div className='absolute inset-0 z-0 opacity-30 pointer-events-none overflow-hidden'>
              <motion.div
                className='absolute top-0 -left-4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10'
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.1, 0.15, 0.1],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className='absolute -bottom-8 right-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10'
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.1, 0.15, 0.1],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
              />
            </div>
            {/* Company logo in bottom left */}
            <div className='absolute bottom-0 left-0 z-20 pointer-events-none'>
              <div className='bg-[#242424] h-8 px-4 flex items-center rounded-tr-lg border-t border-r border-gray-700/30'>
                <h4 className='text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 drop-shadow-lg'>
                  <span className='text-gray-400 text-xs pr-2'>Created by</span>
                  BK GenVibe
                </h4>
              </div>
            </div>
            <iframe
              key={previewKey}
              className='w-full h-full border-none rounded-tl-xl backdrop-blur z-10 relative'
              srcDoc={compileFiles()}
              onLoad={handlePreviewLoad}
              sandbox='allow-scripts allow-same-origin allow-forms allow-popups'
            />
          </div>
        </div>
      )}
    </div>
  );
}
