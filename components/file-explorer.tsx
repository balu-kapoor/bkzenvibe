"use client";

import { FileType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { File, Folder } from "lucide-react";

interface FileExplorerProps {
  files: FileType[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
}

export function FileExplorer({
  files,
  activeFileId,
  onFileSelect,
}: FileExplorerProps) {
  // Group files by directory
  const filesByDirectory: { [key: string]: FileType[] } = {};
  files.forEach((file) => {
    const dir = file.path.split("/").slice(0, -1).join("/") || "/";
    if (!filesByDirectory[dir]) {
      filesByDirectory[dir] = [];
    }
    filesByDirectory[dir].push(file);
  });

  return (
    <div className='h-full w-full overflow-auto p-2'>
      <div className='space-y-1'>
        {Object.entries(filesByDirectory).map(([directory, dirFiles]) => (
          <div key={directory} className='space-y-1'>
            {directory !== "/" && (
              <div className='flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground'>
                <Folder className='h-4 w-4' />
                {directory}
              </div>
            )}
            <div className='space-y-1 pl-3'>
              {dirFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => onFileSelect(file.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-muted/50 transition-colors",
                    activeFileId === file.id &&
                      "bg-purple-500/10 text-purple-500"
                  )}
                >
                  <File className='h-4 w-4' />
                  {file.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
