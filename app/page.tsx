"use client";

import { ChatLayout } from "@/components/chat-layout";
import { GradientTitle } from "@/components/gradient-title";

export default function Home() {
  return (
    <main className='flex min-h-screen flex-col'>
      <ChatLayout />
    </main>
  );
}
