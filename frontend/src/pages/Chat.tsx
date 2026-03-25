import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useChat } from "@/hooks/useChat";
import { useFriends } from "@/hooks/useChat";
import { useLang } from "@/contexts/LanguageContext";
import { UserMenu } from "@/components/UserMenu";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { MessageInput } from "@/components/chat/MessageInput";
import { MemoryPanel } from "@/components/chat/MemoryPanel";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Users, Brain, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const Chat = () => {
  const { friendId } = useParams<{ friendId: string }>();
  const navigate = useNavigate();
  const { t } = useLang();
  const { friends, loadFriends } = useFriends();
  const [selectedFriendId, setSelectedFriendId] = useState<number | null>(
    friendId ? parseInt(friendId) : null
  );
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [showFriendsSidebar, setShowFriendsSidebar] = useState(false);

  const { messages, memories, isLoading, error, sendMessage, loadHistory, clearMessages, loadMemories, subscriptionError, clearSubscriptionError } =
    useChat(selectedFriendId);

  // Загрузка друзей и истории при монтировании
  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  useEffect(() => {
    if (selectedFriendId) {
      clearMessages();
      loadHistory();
      loadMemories();
    }
  }, [selectedFriendId, loadHistory, clearMessages, loadMemories]);

  // Закрываем sidebar при выборе друга на мобильных
  useEffect(() => {
    if (selectedFriendId && window.innerWidth < 768) {
      setShowFriendsSidebar(false);
    }
  }, [selectedFriendId]);

  const selectedFriend = friends.find((f) => f.id === selectedFriendId);

  const handleSend = async (message: string) => {
    await sendMessage(message);
  };

  return (
    <div className="flex h-screen">
      {/* Overlay для мобильных */}
      {showFriendsSidebar && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setShowFriendsSidebar(false)}
        />
      )}

      {/* Боковая панель со списком друзей */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-80 border-r bg-muted/30 transition-transform duration-300 ease-in-out md:static md:translate-x-0",
          showFriendsSidebar ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-2 border-b p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/friends")}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">{t("chat.sidebar_title")}</h2>
        </div>
        <ScrollArea className="h-[calc(100vh-65px)]">
          <div className="p-2">
            {friends.map((friend) => (
              <button
                key={friend.id}
                onClick={() => setSelectedFriendId(friend.id)}
                className={cn(
                  "w-full rounded-lg p-3 text-left transition-colors",
                  selectedFriendId === friend.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <p className="font-medium">{friend.name}</p>
                {friend.tone && (
                  <p
                    className={cn(
                      "text-xs",
                      selectedFriendId === friend.id
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    )}
                  >
                    {friend.tone}
                  </p>
                )}
              </button>
            ))}
            {friends.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>{t("chat.no_friends")}</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => navigate("/friends")}
                >
                  {t("chat.create_friend")}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Окно чата */}
      <div className="flex flex-1 flex-col">
        {selectedFriend ? (
          <>
            {/* Заголовок */}
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-2">
                {/* Кнопка меню друзей для мобильных */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFriendsSidebar(!showFriendsSidebar)}
                  className="md:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div>
                  <h3 className="text-lg font-semibold">{selectedFriend.name}</h3>
                  {selectedFriend.personality && (
                    <p className="text-sm text-muted-foreground">
                      {selectedFriend.personality}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMemoryPanel(!showMemoryPanel)}
                  className={cn(
                    showMemoryPanel && "bg-primary text-primary-foreground"
                  )}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  {t("chat.memory_button")}
                </Button>
                <UserMenu />
              </div>
            </div>

            {/* Сообщения */}
            <ChatWindow messages={messages} isLoading={isLoading} />

            {/* Ввод сообщения */}
            <MessageInput onSend={handleSend} isLoading={isLoading} />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Users className="mx-auto mb-4 h-16 w-16 opacity-20" />
              <p className="text-lg">{t("chat.select_friend")}</p>
            </div>
          </div>
        )}
      </div>

      {/* Панель памяти */}
      <MemoryPanel
        memories={memories}
        isOpen={showMemoryPanel}
        onClose={() => setShowMemoryPanel(false)}
      />

      {/* Модальное окно подписки */}
      <SubscriptionModal
        isOpen={!!subscriptionError}
        onClose={() => clearSubscriptionError()}
        messagesCount={subscriptionError?.messagesCount || 0}
        messagesLimit={subscriptionError?.messagesLimit || 5}
        onActivate={() => {
          // После активации можно сбросить ошибку
          clearSubscriptionError();
        }}
      />
    </div>
  );
};

export default Chat;
