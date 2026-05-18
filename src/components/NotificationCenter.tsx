import { AlertTriangle, CheckCircle2, Crown, Info, X, XCircle } from 'lucide-react';

export type NotificationKind = 'info' | 'success' | 'warning' | 'error' | 'vip';

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
};

type NotificationCenterProps = {
  notifications: NotificationItem[];
  onClose: (id: string) => void;
};

function getIcon(kind: NotificationKind) {
  if (kind === 'vip') {
    return <Crown className="h-5 w-5" />;
  }

  if (kind === 'success') {
    return <CheckCircle2 className="h-5 w-5" />;
  }

  if (kind === 'warning') {
    return <AlertTriangle className="h-5 w-5" />;
  }

  if (kind === 'error') {
    return <XCircle className="h-5 w-5" />;
  }

  return <Info className="h-5 w-5" />;
}

export function NotificationCenter({ notifications, onClose }: NotificationCenterProps) {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-stack" aria-live="polite" aria-relevant="additions removals">
      {notifications.map((notification) => (
        <div className={`app-notification app-notification-${notification.kind}`} key={notification.id} role="status">
          <div className="notification-icon">{getIcon(notification.kind)}</div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-white">{notification.title}</div>
            <div className="mt-1 text-sm leading-5 text-slate-200/90">{notification.message}</div>
          </div>
          <button
            aria-label="Dong thong bao"
            className="notification-close"
            onClick={() => onClose(notification.id)}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
