"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageContent } from "@/components/message-content";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { generateWebApp } from "@/lib/puter-client";
import { FileExplorer } from "@/components/file-explorer";
import { FileType, FileSystemState } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export function WebAppBuilder() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("preview");
  const { toast } = useToast();

  // File system state
  const [fileSystem, setFileSystem] = useState<FileSystemState>({
    files: [],
    activeFileId: null,
  });

  // Function to create a new file
  const createFile = (name: string, content: string, path: string = "/") => {
    const newFile: FileType = {
      id: uuidv4(),
      name,
      content,
      language: name.endsWith(".tsx")
        ? "typescript"
        : name.endsWith(".css")
        ? "css"
        : "json",
      path: path + name,
    };

    setFileSystem((prev) => ({
      ...prev,
      files: [...prev.files, newFile],
      activeFileId: newFile.id,
    }));
  };

  // Function to update file content
  const updateFile = (fileId: string, content: string) => {
    setFileSystem((prev) => ({
      ...prev,
      files: prev.files.map((file) =>
        file.id === fileId ? { ...file, content } : file
      ),
    }));
  };

  // Function to compile all files for preview
  const compileFiles = useCallback(() => {
    const files = fileSystem.files;
    if (!files.length) return "";

    // Combine all TypeScript files
    const tsContent = files
      .filter((f) => f.language === "typescript")
      .map((f) => f.content)
      .join("\n\n");

    // Get CSS content
    const cssContent = files
      .filter((f) => f.language === "css")
      .map((f) => f.content)
      .join("\n");

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>${cssContent}</style>
          <script>
            tailwind.config = {
              darkMode: 'class',
              theme: {
                extend: {},
              },
            }
          </script>
        </head>
        <body>
          <div id="root"></div>
          <script type="text/babel" data-type="module">
            ${tsContent}

            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(
              React.createElement(App, null)
            );
          </script>
        </body>
      </html>
    `;
  }, [fileSystem.files]);

  // Update the iframe when files change
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current && fileSystem.files.length) {
      const previewContent = compileFiles();
      iframeRef.current.srcdoc = previewContent;

      iframeRef.current.onload = () => {
        const iframeWindow = iframeRef.current?.contentWindow;
        if (iframeWindow) {
          iframeWindow.onerror = (msg, url, line) => {
            console.error("Error in preview:", msg, "at line:", line);
            const rootElement = iframeWindow.document.getElementById("root");
            if (rootElement) {
              rootElement.innerHTML = `
                <div class="p-4 text-red-500">
                  Error rendering preview: ${msg} at line ${line}
                </div>
              `;
            }
          };
        }
      };
    }
  }, [fileSystem.files, compileFiles]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setFileSystem({ files: [], activeFileId: null });

    try {
      const response = await generateWebApp(prompt);

      let fullResponse = "";
      for await (const part of response) {
        const text = part?.text || "";
        fullResponse += text;

        // Try to extract and create files as we receive the response
        const lastCodeBlock = text.match(/```(?:typescript|css)\n[\s\S]*?```/);
        if (lastCodeBlock) {
          const block = lastCodeBlock[0];
          const filenameMatch = block.match(/\/\/\s*filename:\s*([\w./]+)/);

          if (filenameMatch) {
            const fileName = filenameMatch[1];
            const content = block
              .split("\n")
              .slice(2) // Skip the ```typescript/css and filename comment lines
              .join("\n")
              .replace(/```$/, "")
              .trim();

            if (content) {
              const path = fileName.includes("/")
                ? fileName.split("/").slice(0, -1).join("/") + "/"
                : "/";

              // Check if file already exists
              const existingFile = fileSystem.files.find(
                (f) => f.path === path + fileName.split("/").pop()
              );
              if (!existingFile) {
                createFile(fileName.split("/").pop()!, content, path);
              }
            }
          }
        }
      }

      // Final pass to catch any missed files
      const codeBlocks =
        fullResponse.match(/```(?:typescript|css)\n[\s\S]*?```/g) || [];

      codeBlocks.forEach((block) => {
        const filenameMatch = block.match(/\/\/\s*filename:\s*([\w./]+)/);
        if (!filenameMatch) return;

        const fileName = filenameMatch[1];
        const content = block
          .split("\n")
          .slice(2)
          .join("\n")
          .replace(/```$/, "")
          .trim();

        if (content) {
          const path = fileName.includes("/")
            ? fileName.split("/").slice(0, -1).join("/") + "/"
            : "/";

          // Check if file already exists
          const existingFile = fileSystem.files.find(
            (f) => f.path === path + fileName.split("/").pop()
          );
          if (!existingFile) {
            createFile(fileName.split("/").pop()!, content, path);
          }
        }
      });

      if (fileSystem.files.length === 0) {
        throw new Error(
          "No valid files were generated. Please try again with a different prompt."
        );
      }

      // Set active tab to files view after generation
      setActiveTab("files");
    } catch (error) {
      console.error("Error generating web app:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to generate web app. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className='grid grid-cols-12 gap-6 p-6 h-[calc(100vh-8rem)]'>
      {/* Left section - 30% */}
      <div className='col-span-4 flex flex-col gap-4'>
        <Card className='flex-1 overflow-hidden border-none shadow-lg bg-gradient-to-b from-background via-background/95 to-background/90'>
          <div className='p-4 flex flex-col h-full gap-4'>
            <Textarea
              placeholder='Describe the web app you want to build...'
              className='flex-1 resize-none bg-background/50 border-muted/30 focus-visible:ring-purple-500/20 focus-visible:ring-offset-0'
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className='w-full bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 text-white hover:from-purple-600 hover:via-blue-600 hover:to-purple-600 transition-all duration-300 shadow-md hover:shadow-lg'
            >
              {isGenerating ? (
                <div className='flex items-center gap-2'>
                  <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                  Generating...
                </div>
              ) : (
                "Generate Web App"
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* Right section - 70% */}
      <div className='col-span-8 flex flex-col'>
        <Card className='flex-1 overflow-hidden border-none shadow-lg bg-gradient-to-b from-background via-background/95 to-background/90'>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='h-full flex flex-col'
          >
            <div className='px-4 py-2 border-b border-muted/20 bg-background/50'>
              <TabsList className='bg-muted/10 p-1'>
                <TabsTrigger
                  value='files'
                  className='data-[state=active]:bg-purple-500 data-[state=active]:text-white'
                >
                  Files
                </TabsTrigger>
                <TabsTrigger
                  value='preview'
                  className='data-[state=active]:bg-purple-500 data-[state=active]:text-white'
                >
                  Preview
                </TabsTrigger>
              </TabsList>
            </div>
            <div className='flex-1 overflow-hidden'>
              <TabsContent value='files' className='h-full m-0'>
                <div className='grid grid-cols-12 h-full divide-x divide-muted/20'>
                  {/* File Explorer */}
                  <div className='col-span-3 h-full border-r border-muted/20'>
                    <FileExplorer
                      files={fileSystem.files}
                      activeFileId={fileSystem.activeFileId}
                      onFileSelect={(fileId) =>
                        setFileSystem((prev) => ({
                          ...prev,
                          activeFileId: fileId,
                        }))
                      }
                    />
                  </div>
                  {/* Code Editor */}
                  <div className='col-span-9 h-full p-4'>
                    {fileSystem.activeFileId ? (
                      <div className='h-full'>
                        <MessageContent
                          content={`\`\`\`${
                            fileSystem.files.find(
                              (f) => f.id === fileSystem.activeFileId
                            )?.language || "typescript"
                          }
${fileSystem.files.find((f) => f.id === fileSystem.activeFileId)?.content || ""}
\`\`\``}
                        />
                      </div>
                    ) : (
                      <div className='h-full flex items-center justify-center text-muted-foreground'>
                        Select a file to view its content
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              <TabsContent
                value='preview'
                className='h-full m-0 overflow-hidden rounded-b-lg'
              >
                {fileSystem.files.length > 0 ? (
                  <div className='h-full bg-background/50 rounded-lg'>
                    <iframe
                      ref={iframeRef}
                      title='Web App Preview'
                      className='w-full h-full'
                      sandbox='allow-scripts allow-same-origin'
                    />
                  </div>
                ) : (
                  <div className='h-full flex items-center justify-center text-muted-foreground'>
                    Your web app preview will appear here
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
