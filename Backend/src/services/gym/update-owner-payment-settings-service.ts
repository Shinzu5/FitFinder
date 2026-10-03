import { GymRepository } from "@/repositories/gym.repository";

const gymRepository = new GymRepository();

type UpdatedGym = Awaited<ReturnType<GymRepository["updateGym"]>>;

type UpdateOwnerPaymentSettingsResult =
  | { kind: "error"; message: string }
  | { kind: "ok"; updated: UpdatedGym };

function isValidXenditKey(key: string): boolean {
  return key.startsWith("xnd_production_") || key.startsWith("xnd_development_");
}

/**
 * PUT /api/owner/payment-settings — optional Xendit config (walk-in always
 * available). Validates the key/enable combination, then persists the gym row.
 */
export async function UpdateOwnerPaymentSettingsService(input: {
  gymId: string;
  /** Current stored key (fallback when enabling without a new key). */
  currentKey: string | null | undefined;
  body: {
    xenditApiKey?: string;
    xenditEnabled?: boolean;
    clearApiKey?: boolean;
  };
}): Promise<UpdateOwnerPaymentSettingsResult> {
  const { gymId, currentKey, body } = input;
  const { xenditApiKey, xenditEnabled, clearApiKey } = body;

  const data: { xenditApiKey?: string; xenditEnabled?: boolean } = {};

  if (clearApiKey === true) {
    data.xenditApiKey = "";
    data.xenditEnabled = false;
  }

  if (typeof xenditApiKey === "string") {
    const trimmed = xenditApiKey.trim();
    if (!trimmed) {
      data.xenditApiKey = "";
      data.xenditEnabled = false;
    } else if (!isValidXenditKey(trimmed)) {
      return { kind: "error", message: "Key must start with xnd_production_ or xnd_development_" };
    } else {
      data.xenditApiKey = trimmed;
      // Saving a valid key enables cashless unless explicitly disabled in same request
      if (typeof xenditEnabled !== "boolean") {
        data.xenditEnabled = true;
      }
    }
  }

  if (typeof xenditEnabled === "boolean") {
    const nextKey = data.xenditApiKey !== undefined ? data.xenditApiKey : currentKey;
    if (xenditEnabled && !isValidXenditKey((nextKey || "").trim())) {
      return { kind: "error", message: "Save a valid Xendit API key before enabling cashless payments" };
    }
    data.xenditEnabled = xenditEnabled;
  }

  if (Object.keys(data).length === 0) {
    return { kind: "error", message: "No payment settings to update" };
  }

  const updated = await gymRepository.updateGym(gymId, data);

  return { kind: "ok", updated };
}
