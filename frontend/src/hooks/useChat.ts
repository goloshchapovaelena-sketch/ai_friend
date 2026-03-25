import { useState, useCallback } from 'react';
import { chatApi, friendsApi, SubscriptionLimitError } from '@/services/api';
import { useLang } from '@/contexts/LanguageContext';
import type { Message, Friend, ChatResponse, Memory } from '@/types';

export interface UseChatResult {
  messages: Message[];
  memories: Memory[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<ChatResponse | null>;
  loadHistory: () => Promise<void>;
  loadMemories: () => Promise<void>;
  clearMessages: () => void;
  subscriptionError: SubscriptionLimitError | null;
  clearSubscriptionError: () => void;
}

export const useChat = (friendId: number | null): UseChatResult => {
  const { lang } = useLang();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [subscriptionError, setSubscriptionError] = useState<SubscriptionLimitError | null>(null);

  // Отправка сообщения
  const sendMessage = useCallback(async (content: string) => {
    if (!friendId) return null;

    setIsLoading(true);
    setError(null);
    setSubscriptionError(null);

    try {
      const response: ChatResponse = await chatApi.send(content, friendId, lang);
      setMessages((prev) => [...prev, response.user_message, response.ai_response]);

      // После отправки обновляем воспоминания
      await loadMemories();

      return response;
    } catch (err) {
      if (err instanceof SubscriptionLimitError) {
        setSubscriptionError(err);
        return null;
      }
      
      const message = err instanceof Error ? err.message : 'Не удалось отправить сообщение';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [friendId, lang]);

  // Загрузка истории
  const loadHistory = useCallback(async () => {
    if (!friendId) return;

    setError(null);
    try {
      const data = await chatApi.history(friendId);
      setMessages(data.messages || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось загрузить историю';
      setError(message);
    }
  }, [friendId]);

  // Загрузка воспоминаний
  const loadMemories = useCallback(async () => {
    if (!friendId) return;

    try {
      const data = await chatApi.memories(friendId);
      setMemories(data.memories || []);
    } catch (err) {
      // Игнорируем ошибки загрузки воспоминаний
      console.error('Failed to load memories:', err);
    }
  }, [friendId]);

  // Очистка чата
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  // Очистка ошибки подписки
  const clearSubscriptionError = useCallback(() => {
    setSubscriptionError(null);
  }, []);

  return {
    messages,
    memories,
    isLoading,
    error,
    sendMessage,
    loadHistory,
    loadMemories,
    clearMessages,
    subscriptionError,
    clearSubscriptionError,
  };
};

export const useFriends = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка списка друзей
  const loadFriends = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await friendsApi.list();
      setFriends(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось загрузить друзей';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Создание друга
  const createFriend = useCallback(async (
    name: string,
    personality?: string,
    tone?: string,
    gender?: string,
    age?: string,
    interests?: string[],
    scenario?: string
  ) => {
    setError(null);
    try {
      const friend: Friend = await friendsApi.create(name, personality, tone, gender, age, interests, scenario);
      setFriends((prev) => [...prev, friend]);
      return { success: true, friend };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось создать друга';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  // Удаление друга
  const deleteFriend = useCallback(async (friendId: number) => {
    setError(null);
    try {
      await friendsApi.delete(friendId);
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось удалить друга';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  return {
    friends,
    isLoading,
    error,
    loadFriends,
    createFriend,
    deleteFriend,
  };
};
