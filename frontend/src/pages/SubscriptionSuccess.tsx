import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

const SubscriptionSuccess = () => {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-6">
      <div className="max-w-md w-full rounded-2xl border bg-card p-8 shadow-lg text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 text-green-600">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Подписка оформлена</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Спасибо за оплату. Премиум активируется через несколько секунд после подтверждения Stripe.
            Можно вернуться в чат.
          </p>
          {sessionId && (
            <p className="mt-3 text-xs text-muted-foreground font-mono break-all">
              Сессия: {sessionId}
            </p>
          )}
        </div>
        <Button asChild className="w-full">
          <Link to="/chat">Перейти в чат</Link>
        </Button>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;
