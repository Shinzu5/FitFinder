"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Brain, Send, Plus, MessageSquare, Trash2, Menu, X } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { type AiChatMessage, type AiConversation, useUserAiStore } from "@/stores/user-ai-store";

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "Member";
}

function AiAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const icon = size === "lg" ? "h-7 w-7" : size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className={`flex ${dim} shrink-0 items-center justify-center rounded-2xl bg-[#FACC15] text-black shadow-lg shadow-[#FACC15]/20`}>
      <Brain className={icon} />
    </div>
  );
}

function AssistantBubble({ message }: { message: AiChatMessage }) {
  return (
    <div className="flex items-start gap-3">
      <AiAvatar size="sm" />
      <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-[#FACC15]/25 bg-[#1a1810] px-4 py-3 text-sm leading-relaxed text-zinc-200 prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-ul:my-1 prose-li:my-0">
        <ReactMarkdown>{message.text}</ReactMarkdown>
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

function getGroupLabel(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);
  
  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  if (date >= lastWeek) return "Last 7 Days";
  return "Older";
}

export function UserAiAssistantPanel() {
  const user = useAuthStore((state) => state.user);
  const {
    conversations,
    activeConversationId,
    initialize,
    createConversation,
    switchConversation,
    deleteConversation,
    sendMessage
  } = useUserAiStore();

  const [draft, setDraft] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const firstName = getFirstName(user?.fullName ?? "Member");

  useEffect(() => {
    initialize(firstName);
  }, [firstName, initialize]);

  const activeConv = activeConversationId ? conversations[activeConversationId] : null;
  const messages = activeConv?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    sendMessage(draft, firstName);
    setDraft("");
  }

  // Group conversations
  const sortedConvs = Object.values(conversations).sort((a, b) => b.updatedAt - a.updatedAt);
  const groupedConvs: Record<string, AiConversation[]> = {};
  
  sortedConvs.forEach(conv => {
    const label = getGroupLabel(conv.updatedAt);
    if (!groupedConvs[label]) groupedConvs[label] = [];
    groupedConvs[label].push(conv);
  });

  const groupOrder = ["Today", "Yesterday", "Last 7 Days", "Older"];

  return (
    <div className="relative mx-auto flex h-[calc(100vh-8.5rem)] min-h-[520px] max-w-5xl overflow-hidden rounded-2xl border border-zinc-800/70 bg-[#0e0e10]">
      
      {/* Mobile Sidebar Toggle */}
      <button 
        className="absolute left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="absolute inset-0 z-30 bg-black/50 md:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      {/* Sidebar */}
      <div className={`absolute inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-800/70 bg-[#09090b] transition-transform duration-300 md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-4">
          <button 
            onClick={() => {
              createConversation(firstName);
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-xl bg-[#FACC15]/10 px-4 py-3 text-sm font-medium text-[#FACC15] transition hover:bg-[#FACC15]/20"
          >
            <Plus size={18} />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-0 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800">
          {groupOrder.map((group) => {
            const convs = groupedConvs[group];
            if (!convs || convs.length === 0) return null;
            return (
              <div key={group} className="mb-6">
                <h3 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{group}</h3>
                <div className="space-y-1">
                  {convs.map((conv) => (
                    <div 
                      key={conv.id}
                      onClick={() => {
                        switchConversation(conv.id);
                        if (window.innerWidth < 768) setSidebarOpen(false);
                      }}
                      className={`group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${activeConversationId === conv.id ? "bg-zinc-800/80 text-white" : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"}`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <MessageSquare size={15} className={`shrink-0 ${activeConversationId === conv.id ? "text-[#FACC15]" : "text-zinc-500"}`} />
                        <span className="truncate">{conv.title}</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                        className="opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                        title="Delete Chat"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <header className="border-b border-zinc-800/70 px-6 py-4 text-center md:py-6">
          <div className="mx-auto flex max-w-md flex-col items-center gap-2 md:gap-3">
            <AiAvatar size="md" />
            <div>
              <h1 className="text-xl font-bold text-white md:text-2xl">Fitness AI Assistant</h1>
              <p className="mt-1 text-xs text-zinc-500 md:text-sm">Powered by Gemini</p>
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6 sm:px-8 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-800">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500">
              <MessageSquare size={40} className="mb-4 opacity-20" />
              <p>Start a new conversation</p>
            </div>
          ) : (
            messages.map((message) =>
              message.sender === "assistant" ? (
                <AssistantBubble key={message.id} message={message} />
              ) : (
                <UserBubble key={message.id} message={message} />
              ),
            )
          )}
          <div ref={messagesEndRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="flex items-center gap-3 border-t border-zinc-800/70 p-4 sm:px-6 md:p-5"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about workouts, nutrition, recovery..."
            className="flex-1 rounded-xl border border-zinc-800/80 bg-[#131315] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#FACC15]/40 focus:ring-1 focus:ring-[#FACC15]/40"
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
    </div>
  );
}
