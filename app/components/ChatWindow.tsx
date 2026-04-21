"use client";

import { useEffect, useRef } from "react";
import { Message } from "@/types";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";

interface ChatWindowProps {
  messages: Message[];
  streamingMessage: string;
  isLoading: boolean;
}

export default function ChatWindow({
  messages,
  streamingMessage,
  isLoading,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
      ))}

      {/* Streaming assistant message in progress */}
      {streamingMessage && (
        <MessageBubble role="assistant" content={streamingMessage} />
      )}

      {/* Typing indicator when waiting for first chunk */}
      {isLoading && !streamingMessage && <TypingIndicator />}

      <div ref={bottomRef} />
    </div>
  );
}
