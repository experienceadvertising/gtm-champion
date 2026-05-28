import { useState, useEffect, useCallback } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

const SNOOZE_KEY = "gtm-notif-snooze-until";
const SUBSCRIBED_KEY = "gtm-notif-subscribed";
const SNOOZE_DAYS = 14;

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
  return match ? match[1] : "";
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

function isSnoozed(): boolean {
  const until = localStorage.getItem(SNOOZE_KEY);
  if (!until) return false;
  return Date.now() < new Date(until).getTime();
}

function snooze() {
  const until = new Date(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  localStorage.setItem(SNOOZE_KEY, until);
}

interface PushPermissionPromptProps {
  triggered: boolean;
}

export function PushPermissionPrompt({ triggered }: PushPermissionPromptProps) {
  const [visible, setVisible] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusChecked, setStatusChecked] = useState(false);
  const { toast } = useToast();

  const checkStatus = useCallback(async () => {
    if (!("Notification" in window) || !("PushManager" in window)) {
      setStatusChecked(true);
      return;
    }
    if (Notification.permission === "granted" && localStorage.getItem(SUBSCRIBED_KEY) === "true") {
      setSubscribed(true);
      setStatusChecked(true);
      return;
    }
    try {
      const res = await fetch("/api/notifications/status", { credentials: "include" });
      if (!res.ok) { setStatusChecked(true); return; }
      const data = await res.json();
      setSubscribed(data.subscribed);
      if (data.subscribed) {
        localStorage.setItem(SUBSCRIBED_KEY, "true");
      }
    } catch {
    } finally {
      setStatusChecked(true);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    if (!statusChecked) return;
    if (subscribed) return;
    if (!triggered) return;
    if (isSnoozed()) return;
    if (!("Notification" in window) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") return;

    const timer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timer);
  }, [statusChecked, subscribed, triggered]);

  async function subscribeToPush() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast({
          title: "Permission denied",
          description: "You can enable notifications in your browser settings.",
          variant: "destructive",
        });
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
      setVisible(false);
      localStorage.setItem(SUBSCRIBED_KEY, "true");
      toast({ title: "Push notifications enabled!", description: "You'll be notified when your GTM Agent has updates." });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to enable notifications", variant: "destructive" });
    }
    setLoading(false);
  }

  function dismiss() {
    setVisible(false);
    snooze();
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300"
      role="dialog"
      aria-label="Enable push notifications"
      data-testid="push-permission-prompt"
    >
      <div className="mx-4 rounded-xl border border-indigo-200 bg-white dark:bg-slate-900 dark:border-indigo-800 shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center shrink-0 mt-0.5">
            <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Stay on top of your GTM goals</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Get instant push alerts when your GTM Agent checks in — stall nudges, win celebrations, and weekly digests.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                className="h-7 px-3 text-xs bg-indigo-600 hover:bg-indigo-700"
                onClick={subscribeToPush}
                disabled={loading}
                data-testid="button-enable-push"
              >
                {loading ? "Enabling…" : "Enable notifications"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-3 text-xs text-muted-foreground"
                onClick={dismiss}
                data-testid="button-snooze-push"
              >
                Not now
              </Button>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Dismiss notification prompt"
            data-testid="button-close-push-prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AgentPushOptIn() {
  const [subscribed, setSubscribed] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!("Notification" in window) || !("PushManager" in window)) {
      setChecked(true);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/notifications/status", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setSubscribed(data.subscribed);
        setEnabled(data.enabled);
      } catch {
      } finally {
        setChecked(true);
      }
    })();
  }, []);

  async function subscribeToPush() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast({ title: "Permission denied", description: "Enable notifications in your browser settings.", variant: "destructive" });
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
      toast({ title: "Push alerts enabled!", description: "Your GTM Agent will notify you of check-ins and wins." });
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
      toast({ title: newEnabled ? "Push alerts enabled" : "Push alerts paused" });
    } catch {
      toast({ title: "Error", description: "Failed to update notification preferences", variant: "destructive" });
    }
  }

  if (!checked) return null;
  if (!("Notification" in window) || !("PushManager" in window)) return null;
  if (Notification.permission === "denied") return null;

  return (
    <div className="flex items-center justify-between rounded-lg bg-white/70 dark:bg-white/5 border border-indigo-100 px-3 py-2" data-testid="agent-push-opt-in">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-indigo-500 shrink-0" />
        <div>
          <p className="text-xs font-medium text-foreground">Push alerts</p>
          <p className="text-[11px] text-muted-foreground">Browser notifications for agent check-ins</p>
        </div>
      </div>
      {subscribed ? (
        <Switch
          checked={enabled}
          onCheckedChange={toggleNotifications}
          aria-label="Toggle GTM Agent push notifications"
          data-testid="toggle-agent-push"
        />
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[11px] border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          onClick={subscribeToPush}
          disabled={loading}
          data-testid="button-agent-enable-push"
        >
          {loading ? "…" : "Enable"}
        </Button>
      )}
    </div>
  );
}
