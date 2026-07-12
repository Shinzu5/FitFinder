"use client";

import { useEffect, useRef, useState } from "react";
import { Brain, Send } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { type AiChatMessage, useUserAiStore } from "@/stores/user-ai-store";

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "Member";
}

function AiAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim =
    size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const icon = size === "lg" ? "h-7 w-7" : size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div
      className={`flex ${dim} shrink-0 items-center justify-center rounded-2xl bg-[#FACC15] text-black shadow-lg shadow-[#FACC15]/20`}
    >
      <Brain className={icon} />
    </div>
  );
}

function AssistantBubble({ message }: { message: AiChatMessage }) {
  return (
    <div className="flex items-start gap-3">
      <AiAvatar size="sm" />
      <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-[#FACC15]/25 bg-[#1a1810] px-4 py-3 text-sm leading-relaxed text-zinc-200">
        {message.text}
      </div>
    </div>
  );
}

function UserBubble({ message }: { message: AiChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#FACC15] px-4 py-3 text-sm text-black">
        {message.text}
      </div>
    </div>
  );
}

export function UserAiAssistantPanel() {
  const user = useAuthStore((state) => state.user);
  const messages = useUserAiStore((state) => state.messages);
  const initialize = useUserAiStore((state) => state.initialize);
  const sendMessage = useUserAiStore((state) => state.sendMessage);

  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const firstName = getFirstName(user?.fullName ?? "Member");

  useEffect(() => {
    initialize(firstName);
  }, [firstName, initialize]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    sendMessage(draft);
    setDraft("");
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8.5rem)] min-h-[520px] max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
      <header className="border-b border-zinc-800/70 px-6 py-6 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3">
          <AiAvatar size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-white">Fitness AI Assistant</h1>
            <p className="mt-1 text-sm text-zinc-500">Powered by Gemini · Fitness-focused</p>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6 sm:px-8">
        {messages.map((message) =>
          message.sender === "assistant" ? (
            <AssistantBubble key={message.id} message={message} />
          ) : (
            <UserBubble key={message.id} message={message} />
          ),
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="flex items-center gap-3 border-t border-zinc-800/70 px-5 py-4 sm:px-6"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about workouts, nutrition, recovery..."
          className="flex-1 rounded-xl border border-zinc-800/80 bg-[#131315] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#FACC15]/40"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FACC15] text-black transition hover:bg-[#e6c200] disabled:opacity-40"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
