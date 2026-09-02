import { useRef, useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { verifyHuman } from '../api/client';

interface AccessGateProps {
  onVerified: () => void;
}

function formatVerifyError(err: unknown): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return 'אימות האבטחה נכשל. אנא נסה שוב.';
}

export function AccessGate({ onVerified }: AccessGateProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [widgetKey, setWidgetKey] = useState(0);
  const inFlight = useRef(false);

  const handleSuccess = async (token: string) => {
    if (inFlight.current) return;
    inFlight.current = true;

    // Start siteverify before any re-render that could reset the widget.
    const verification = verifyHuman(token);
    setIsVerifying(true);
    setError(null);

    try {
      await verification;
      onVerified();
    } catch (err: unknown) {
      inFlight.current = false;
      setIsVerifying(false);
      setError(formatVerifyError(err));
    }
  };

  const handleRetry = () => {
    inFlight.current = false;
    setError(null);
    setIsVerifying(false);
    setWidgetKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-textPrimary p-4 font-sans" dir="rtl">
      <div className="w-full max-w-md card p-8 bg-surface/70 backdrop-blur-md border-border/80 flex flex-col items-center text-center gap-5">
        <div className="bg-primary/5 p-3 rounded-xl border border-primary/20">
          <img
            src="/favicon.svg"
            alt="Professor Orca"
            className="w-16 h-16 object-contain drop-shadow-md"
          />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Professor Orca
          </h1>
          <p className="text-sm text-textSecondary leading-relaxed">
            לפני שנמשיך, נא לאשר שאינך בוט. האימות נשמר לסשן הגלישה — אחר כך אפשר לבנות מערכת שעות בלי לעצור שוב.
          </p>
        </div>

        {error && (
          <div className="w-full bg-danger/10 border border-danger/50 text-danger-light p-2.5 rounded-md flex items-start gap-2 text-sm text-right">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="w-full flex flex-col items-center gap-3">
          <div className="relative w-full">
            <div className={`w-full inline-flex flex-col items-center rounded-lg bg-background/50 p-2 border border-border/40 shadow-inner ${isVerifying ? 'opacity-60 pointer-events-none' : ''}`} dir="ltr">
              <Turnstile
                key={widgetKey}
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                onSuccess={handleSuccess}
                onError={() => {
                  if (inFlight.current) return;
                  setError('אימות האבטחה נכשל. אנא נסה שוב.');
                }}
                options={{
                  theme: 'dark',
                  size: 'flexible'
                }}
              />
            </div>
            {isVerifying && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="flex items-center gap-2 text-sm text-textSecondary bg-surface/90 px-3 py-1.5 rounded-md">
                  <Loader2 className="animate-spin" size={16} />
                  מאמת חיבור מאובטח...
                </span>
              </div>
            )}
          </div>

          {error && !isVerifying && (
            <button
              type="button"
              onClick={handleRetry}
              className="btn-primary px-4 py-2 text-sm"
            >
              נסה שוב
            </button>
          )}

          <p className="text-xs text-textSecondary/80 flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-primary-light shrink-0" />
            מוגן באמצעות Cloudflare Turnstile
          </p>
        </div>
      </div>
    </div>
  );
}
