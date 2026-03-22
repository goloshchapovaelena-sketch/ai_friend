import { useEffect, useRef, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { useLang } from "@/contexts/LanguageContext";
import type { Message } from "@/types";

interface ChatWindowProps {
  messages: Message[];
  isLoading?: boolean;
}

export const ChatWindow = ({ messages, isLoading }: ChatWindowProps) => {
  const { t } = useLang();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Сортируем сообщения по дате (старые сверху, новые снизу)
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [messages]);

  // Автопрокрутка вниз при новых сообщениях
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sortedMessages]);

  return (
    <div className="flex-1 overflow-hidden">
      <ScrollArea className="h-full p-4">
        <div ref={scrollRef} className="flex flex-col gap-3">
          {sortedMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p>{t("chat.empty_chat_message")}</p>
            </div>
          ) : (
            sortedMessages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-muted px-4 py-2">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
};
