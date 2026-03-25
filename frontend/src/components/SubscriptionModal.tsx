import { useState } from 'react';
import { subscriptionApi } from '@/services/api';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  messagesCount: number;
  messagesLimit: number;
  onActivate?: () => void;
}

export const SubscriptionModal = ({ isOpen, onClose, messagesCount, messagesLimit, onActivate }: SubscriptionModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleActivate = async (planType: 'monthly' | 'yearly') => {
    setIsLoading(true);
    setError(null);

    try {
      await subscriptionApi.activate(planType);
      onActivate?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка активации подписки');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Лимит сообщений исчерпан
          </h2>
          <p className="text-gray-600">
            Вы отправили {messagesCount} из {messagesLimit} бесплатных сообщений
          </p>
        </div>

        {/* Benefits */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Преимущества подписки:</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Безлимитные сообщения
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Приоритетная поддержка
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Доступ ко всем функциям
            </li>
          </ul>
        </div>

        {/* Plans */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleActivate('monthly')}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between group"
          >
            <span>Monthly</span>
            <div className="flex items-center">
              <span className="text-lg">$9.99</span>
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => handleActivate('yearly')}
            disabled={isLoading}
            className="w-full bg-white border-2 border-purple-600 text-purple-600 py-3 px-4 rounded-xl font-semibold hover:bg-purple-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between group relative"
          >
            <div className="absolute -top-3 right-4 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs px-2 py-1 rounded-full font-semibold">
              -17%
            </div>
            <span>Yearly</span>
            <div className="flex items-center">
              <span className="text-lg">$99.99</span>
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Demo notice */}
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-xs text-center">
          ℹ️ Сейчас подписка активируется бесплатно (Demo режим)
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full mt-4 text-gray-500 hover:text-gray-700 text-sm font-medium py-2"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
};
