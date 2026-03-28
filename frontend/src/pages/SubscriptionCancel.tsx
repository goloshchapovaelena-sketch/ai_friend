import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const SubscriptionCancel = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-6">
      <div className="max-w-md w-full rounded-2xl border bg-card p-8 shadow-lg text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Оплата не завершена</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Вы отменили оплату или закрыли окно Stripe. Подписка не списана — вы можете попробовать снова из чата.
          </p>
        </div>
        <Button asChild variant="secondary" className="w-full">
          <Link to="/chat">Вернуться в чат</Link>
        </Button>
      </div>
    </div>
  );
};

export default SubscriptionCancel;
