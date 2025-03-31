import { Metadata } from "next";
import { WebAppBuilder } from "@/components/web-app-builder";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Web App Builder - BK Zen Vibe",
  description: "Build beautiful web applications with AI assistance.",
};

export default function BuildPage() {
  return (
    <div className='flex-1 flex flex-col w-full'>
      <div className='flex flex-col flex-1'>
        <div className='flex items-center justify-between p-6 border-b bg-gradient-to-r from-background via-background/95 to-background/90'>
          <div>
            <h1 className='text-2xl font-bold bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 bg-clip-text text-transparent'>
              Web App Builder
            </h1>
            <p className='text-muted-foreground'>
              Build beautiful web applications with AI assistance
            </p>
          </div>
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          <WebAppBuilder />
        </Suspense>
      </div>
    </div>
  );
}
