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
        <Suspense fallback={<div>Loading...</div>}>
          <WebAppBuilder />
        </Suspense>
      </div>
    </div>
  );
}
