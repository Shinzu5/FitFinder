"use client";

import { useState } from "react";
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
  const { xenditApiKey, connectionTested, saveApiKey, setConnectionTested } =
    useOwnerSettingsStore();
  const [inputValue, setInputValue] = useState(xenditApiKey ?? "");
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const hasSavedKey = Boolean(xenditApiKey);

  function handleSave() {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setMessage("Please paste your Xendit secret API key.");
      return;
    }
    if (!isValidXenditKey(trimmed)) {
      setMessage("Key must start with xnd_production_ or xnd_development_.");
      return;
    }
    saveApiKey(trimmed);
    setMessage("API key saved. GCash payments are now enabled.");
  }

  function handleTestConnection() {
    const key = inputValue.trim() || xenditApiKey;
    if (!key || !isValidXenditKey(key)) {
      setMessage("Save a valid Xendit API key before testing the connection.");
      return;
    }
    setConnectionTested(true);
    setMessage("Connection successful. Xendit is ready to receive GCash payments.");
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
              Connect your Xendit account to receive GCash payments directly from your
              gym members.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-[#0f0f0f] px-4 py-3 text-sm">
          <span className="text-zinc-500">● </span>
          {hasSavedKey ? (
            <span className="text-emerald-400">
              API key saved — GCash payments are <strong>enabled</strong>
            </span>
          ) : (
            <span className="text-zinc-400">
              No API key saved — GCash payments are <strong className="text-white">disabled</strong>
            </span>
          )}
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-[#FFD700]/30 bg-[#FFD700]/5 px-4 py-3 text-sm text-[#FFD700]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <strong>Never share your secret API key.</strong> It gives full access to your
          Xendit account. This key is stored encrypted and never shown to gym members or
          staff.
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

        <label className="mb-2 block text-sm text-zinc-400">
          Paste your Xendit live secret key
        </label>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
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

        <div className="mt-5 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FFD700] px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6c200]"
          >
            <Lock className="h-4 w-4" />
            SAVE API KEY
          </button>
          <button
            type="button"
            onClick={handleTestConnection}
            className="text-sm font-medium text-zinc-400 transition hover:text-[#FFD700]"
          >
            Test connection
          </button>
        </div>

        {message ? (
          <p
            className={`mt-4 text-sm ${
              message.includes("successful") || message.includes("saved")
                ? "text-emerald-400"
                : "text-red-400"
            }`}
          >
            {message}
          </p>
        ) : null}
        {connectionTested && hasSavedKey ? (
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
              Paste it above and click <strong className="text-white">Save API key</strong>.
              GCash payments from your gym go live instantly.
            </span>
          </li>
        </ol>
      </section>

      {hasSavedKey ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          Once saved, GCash payments from your gym members are automatically processed and
          transferred to your Xendit balance — no manual action needed.
        </div>
      ) : null}
    </div>
  );
}
