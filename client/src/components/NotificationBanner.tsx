import { useState, useEffect } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
  return match ? match[1] : "";
}

export function NotificationBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const wasDismissed = localStorage.getItem("gtm-notif-dismissed");
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    checkNotificationStatus();
  }, []);

  async function checkNotificationStatus() {
    try {
      const res = await fetch("/api/notifications/status", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setSubscribed(data.subscribed);
      setEnabled(data.enabled);
      if (!data.subscribed && "Notification" in window && "PushManager" in window) {
        setShowBanner(true);
      }
    } catch {
    }
  }

  async function subscribeToPush() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast({ title: "Permission denied", description: "You can enable notifications in your browser settings", variant: "destructive" });
        setLoading(false);
        return;
      }

      const keyRes = await fetch("/api/notifications/vapid-key", { credentials: "include" });
      if (!keyRes.ok) throw new Error("Failed to get push key");
      const { publicKey } = await keyRes.json();

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const sub = subscription.toJSON();
      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: sub.keys }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to subscribe");

      setSubscribed(true);
      setEnabled(true);
      setShowBanner(false);
      toast({ title: "Notifications enabled!", description: "You'll receive GTM tips 2-3 times per week" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to enable notifications", variant: "destructive" });
    }
    setLoading(false);
  }

  async function toggleNotifications(newEnabled: boolean) {
    try {
      const res = await fetch("/api/notifications/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": getCsrfToken() },
        body: JSON.stringify({ enabled: newEnabled }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle");
      setEnabled(newEnabled);
      toast({ title: newEnabled ? "Notifications enabled" : "Notifications paused" });
    } catch {
      toast({ title: "Error", description: "Failed to update notification preferences", variant: "destructive" });
    }
  }

  function dismiss() {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("gtm-notif-dismissed", "true");
  }

  if (dismissed && !subscribed) return null;

  if (subscribed) {
    return (
      <div className="flex items-center gap-2 text-sm" data-testid="notification-toggle">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground hidden sm:inline">Tips</span>
        <Switch
          checked={enabled}
          onCheckedChange={toggleNotifications}
          data-testid="toggle-notifications"
          aria-label="Toggle push notifications"
        />
      </div>
    );
  }

  if (!showBanner) return null;

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30" data-testid="notification-banner">
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Get GTM tips & reminders</p>
          <p className="text-xs text-muted-foreground">Receive 2-3 actionable marketing tips per week</p>
        </div>
        <Button
          size="sm"
          onClick={subscribeToPush}
          disabled={loading}
          data-testid="button-enable-notifications"
        >
          {loading ? "Enabling..." : "Enable"}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 shrink-0"
          onClick={dismiss}
          aria-label="Dismiss notification prompt"
          data-testid="button-dismiss-notifications"
        >
          <X className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
