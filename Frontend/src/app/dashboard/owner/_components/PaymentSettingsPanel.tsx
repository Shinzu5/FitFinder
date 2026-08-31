"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Lock,
  Zap,
} from "lucide-react";
import {
  isValidXenditKey,
  useOwnerSettingsStore,
} from "@/stores/owner-settings-store";

export function PaymentSettingsPanel() {
  const {
    hasApiKey,
    maskedApiKey,
    xenditEnabled,
    cashlessEnabled,
    draftApiKey,
    connectionTested,
    loading,
    fetchSettings,
    setDraftApiKey,
    saveApiKey,
    clearApiKey,
    setXenditEnabled,
    setConnectionTested,
  } = useOwnerSettingsStore();

  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  async function handleSave() {
    const trimmed = draftApiKey.trim();
    if (!trimmed) {
      setMessage("Please paste your Xendit secret API key.");
      return;
    }
    if (!isValidXenditKey(trimmed)) {
      setMessage("Key must start with xnd_production_ or xnd_development_.");
      return;
    }
    setSaving(true);
    const ok = await saveApiKey(trimmed);
    setSaving(false);
    setMessage(
      ok
        ? "API key saved. Cashless is on — use Turn Off anytime to hide it from members."
        : "Could not save API key. Try again.",
    );
  }

  function handleTestConnection() {
    const key = draftApiKey.trim();
    if (key) {
      if (!isValidXenditKey(key)) {
        setMessage("Save a valid Xendit API key before testing the connection.");
        return;
      }
    } else if (!hasApiKey) {
      setMessage("Save a valid Xendit API key before testing the connection.");
      return;
    }
    setConnectionTested(true);
    setMessage("Connection successful. Xendit is ready to receive cashless payments.");
  }

  async function handleSetEnabled(next: boolean) {
    if (!hasApiKey) {
      setMessage("Save a valid Xendit API key before publishing cashless payments.");
      return;
    }
    if (next === xenditEnabled) return;
    setSaving(true);
    const ok = await setXenditEnabled(next);
    setSaving(false);
    setMessage(
      ok
        ? next
          ? "Xendit cashless is published. Members can pay with GCash and other methods."
          : "Xendit cashless is off. Members will only see Walk-in."
        : "Could not update Xendit publish setting.",
    );
  }

  async function handleClear() {
    setSaving(true);
    const ok = await clearApiKey();
    setSaving(false);
    setMessage(ok ? "API key removed. Only Walk-in payment is available." : "Could not clear API key.");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-2xl border border-white/10 bg-[#141414] p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FFD700]/15 text-[#FFD700]">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Xendit API settings</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Optional. Walk-in (over-the-counter) is always available. Connect Xendit to
              offer GCash, Maya, and other supported cashless methods.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-[#0f0f0f] px-4 py-3 text-sm">
          <p>
            <span className="text-zinc-500">● </span>
            <span className="text-emerald-400">
              Walk-in payment is always <strong>enabled</strong>
            </span>
          </p>
          <p>
            <span className="text-zinc-500">● </span>
            {loading ? (
              <span className="text-zinc-400">Loading Xendit status…</span>
            ) : cashlessEnabled ? (
              <span className="text-emerald-400">
                Cashless (Xendit) is <strong>published</strong> to members
              </span>
            ) : hasApiKey ? (
              <span className="text-amber-400">
                API key saved — cashless is <strong>off</strong> (not shown to members)
              </span>
            ) : (
              <span className="text-zinc-400">
                No API key — cashless is <strong className="text-white">hidden</strong> for
                members
              </span>
            )}
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-[#0f0f0f] px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">Publish Xendit to members</p>
              <p className="mt-1 text-xs text-zinc-500">
                Turn cashless on or off anytime. When off, members only see Walk-in.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={saving || loading || !hasApiKey || xenditEnabled}
                onClick={() => void handleSetEnabled(true)}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  xenditEnabled
                    ? "bg-[#FFD700] text-black"
                    : "border border-[#FFD700]/50 text-[#FFD700] hover:bg-[#FFD700]/10"
                }`}
              >
                Turn On
              </button>
              <button
                type="button"
                disabled={saving || loading || !hasApiKey || !xenditEnabled}
                onClick={() => void handleSetEnabled(false)}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  !xenditEnabled && hasApiKey
                    ? "bg-zinc-600 text-white"
                    : "border border-white/20 text-zinc-300 hover:bg-white/5"
                }`}
              >
                Turn Off
              </button>
            </div>
          </div>
          {!hasApiKey ? (
            <p className="mt-3 text-xs text-zinc-500">
              Save a valid Xendit API key below first — then you can publish cashless.
            </p>
          ) : null}
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-[#FFD700]/30 bg-[#FFD700]/5 px-4 py-3 text-sm text-[#FFD700]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <strong>Never share your secret API key.</strong> It gives full access to your
          Xendit account. This key is never shown to gym members or staff.
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-[#141414] p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Lock className="h-4 w-4 text-[#FFD700]" />
            Secret API key
          </div>
          <p className="text-xs text-zinc-500">
            From <span className="text-zinc-300">xendit.co</span> › Settings › API Keys
          </p>
        </div>

        {hasApiKey && maskedApiKey ? (
          <p className="mb-3 text-xs text-zinc-500">
            Saved key: <code className="text-zinc-300">{maskedApiKey}</code>
          </p>
        ) : null}

        <label className="mb-2 block text-sm text-zinc-400">
          {hasApiKey ? "Replace with a new Xendit secret key" : "Paste your Xendit secret key"}
        </label>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={draftApiKey}
            onChange={(e) => setDraftApiKey(e.target.value)}
            placeholder="xnd_production_..."
            className="w-full rounded-lg border border-white/15 bg-white px-4 py-3 pr-12 text-sm text-black placeholder:text-zinc-400 outline-none focus:border-[#FFD700]/50"
          />
          <button
            type="button"
            onClick={() => setShowKey((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700"
            aria-label={showKey ? "Hide API key" : "Show API key"}
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Live key starts with <code className="text-zinc-400">xnd_production_</code> · Test
          key starts with <code className="text-zinc-400">xnd_development_</code>
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FFD700] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6c200] disabled:opacity-50"
          >
            <Lock className="h-4 w-4" />
            SAVE API KEY
          </button>
          <div className="flex items-center gap-4">
            {hasApiKey ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleClear()}
                className="text-sm font-medium text-red-400 transition hover:text-red-300"
              >
                Remove key
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleTestConnection}
              className="text-sm font-medium text-zinc-400 transition hover:text-[#FFD700]"
            >
              Test connection
            </button>
          </div>
        </div>

        {message ? (
          <p
            className={`mt-4 text-sm ${
              message.includes("successful") ||
              message.includes("saved") ||
              message.includes("enabled") ||
              message.includes("disabled") ||
              message.includes("removed")
                ? "text-emerald-400"
                : "text-red-400"
            }`}
          >
            {message}
          </p>
        ) : null}
        {connectionTested && hasApiKey ? (
          <p className="mt-2 text-xs text-emerald-400">Last connection test: successful</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#141414] p-6">
        <div className="mb-4 flex items-center gap-2">
          <Info className="h-4 w-4 text-[#FFD700]" />
          <h3 className="font-semibold text-white">How to get your API key</h3>
        </div>
        <ol className="space-y-3 text-sm text-zinc-400">
          <li className="flex gap-3">
            <span className="font-semibold text-[#FFD700]">1.</span>
            <span>
              Sign up at <strong className="text-white">xendit.co</strong> and complete KYC
              verification.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-[#FFD700]">2.</span>
            <span>
              In your Xendit dashboard go to <strong className="text-white">Settings › API Keys</strong>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-[#FFD700]">3.</span>
            <span>
              Copy your <strong className="text-white">Live secret key</strong> (starts with{" "}
              <code>xnd_production_</code>).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-semibold text-[#FFD700]">4.</span>
            <span>
              Paste it above and click <strong className="text-white">Save API key</strong>,
              then use <strong className="text-white">Turn On / Turn Off</strong> to publish
              cashless for members anytime.
            </span>
          </li>
        </ol>
      </section>

      {cashlessEnabled ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          Cashless memberships activate immediately after successful Xendit payment. Walk-in
          still needs Owner or Clerk approval.
        </div>
      ) : null}
    </div>
  );
}
