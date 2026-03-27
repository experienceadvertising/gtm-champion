import { useEffect, useCallback } from "react";

interface ShortcutConfig {
  onSearch?: () => void;
  onEscape?: () => void;
  onHelp?: () => void;
  onChannelSelect?: (index: number) => void;
}

export function useKeyboardShortcuts(config: ShortcutConfig) {
  const handler = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

    if (e.key === "Escape") {
      config.onEscape?.();
      return;
    }

    if (isInput) return;

    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      config.onSearch?.();
      return;
    }

    if (e.key === "/") {
      e.preventDefault();
      config.onSearch?.();
      return;
    }

    if (e.key === "?") {
      e.preventDefault();
      config.onHelp?.();
      return;
    }

    const num = parseInt(e.key);
    if (num >= 1 && num <= 9 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      config.onChannelSelect?.(num - 1);
    }
  }, [config]);

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}

export const KEYBOARD_SHORTCUTS = [
  { keys: ["Ctrl", "K"], description: "Search recommendations" },
  { keys: ["/"], description: "Focus search" },
  { keys: ["?"], description: "Show keyboard shortcuts" },
  { keys: ["Esc"], description: "Close dialogs" },
  { keys: ["1-9"], description: "Switch channels" },
];
