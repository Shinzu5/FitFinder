"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatPlanPrice,
  type MembershipPlan,
  useOwnerMembershipPlansStore,
} from "@/stores/owner-membership-plans-store";

interface PlanFormValues {
  name: string;
  price: string;
  durationDays: string;
}

const EMPTY_FORM: PlanFormValues = { name: "", price: "", durationDays: "" };

function planToForm(plan: MembershipPlan): PlanFormValues {
  return {
    name: plan.name,
    price: String(plan.price),
    durationDays: String(plan.durationDays),
  };
}

function validateForm(values: PlanFormValues) {
  const name = values.name.trim();
  const price = Number(values.price);
  const durationDays = Number(values.durationDays);

  if (!name) return "Plan name is required.";
  if (!Number.isFinite(price) || price <= 0) return "Enter a valid price.";
  if (!Number.isFinite(durationDays) || durationDays <= 0) return "Enter a valid duration.";

  return null;
}

function NewPlanCard({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (values: PlanFormValues) => string | null;
}) {
  const [form, setForm] = useState<PlanFormValues>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = onCreate(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setForm(EMPTY_FORM);
    setError(null);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[#FFD700]/40 bg-[#141414] p-5"
    >
      <p className="mb-4 text-sm font-semibold text-[#FFD700]">New Plan</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="newPlanName">Plan Name</Label>
          <Input
            id="newPlanName"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="1 Month Basic"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPlanPrice">Price</Label>
          <Input
            id="newPlanPrice"
            type="number"
            min={1}
            value={form.price}
            onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
            placeholder="1000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPlanDuration">Duration (days)</Label>
          <Input
            id="newPlanDuration"
            type="number"
            min={1}
            value={form.durationDays}
            onChange={(e) => setForm((prev) => ({ ...prev, durationDays: e.target.value }))}
            placeholder="30"
          />
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-zinc-400 transition hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-[#FFD700] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#e6c200]"
        >
          Create Plan
        </button>
      </div>
    </form>
  );
}

function PlanCard({
  plan,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  plan: MembershipPlan;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (values: PlanFormValues) => string | null;
  onDelete: () => void;
}) {
  const [form, setForm] = useState<PlanFormValues>(planToForm(plan));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) {
      setForm(planToForm(plan));
      setError(null);
    }
  }, [isEditing, plan]);

  if (isEditing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const validationError = onSave(form);
          if (validationError) {
            setError(validationError);
            return;
          }
          setError(null);
        }}
        className="rounded-2xl border border-[#FFD700]/40 bg-[#141414] p-5"
      >
        <p className="mb-4 text-sm font-semibold text-[#FFD700]">Edit Plan</p>
        <div className="space-y-3">
          <Input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Plan name"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              min={1}
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
              placeholder="Price"
            />
            <Input
              type="number"
              min={1}
              value={form.durationDays}
              onChange={(e) => setForm((prev) => ({ ...prev, durationDays: e.target.value }))}
              placeholder="Duration (days)"
            />
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-[#FFD700] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#e6c200]"
          >
            Save
          </button>
        </div>
      </form>
    );
  }

  return (
    <article className="flex flex-col rounded-2xl border border-white/10 bg-[#141414] p-5">
      <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
      <p className="mt-2 text-2xl font-bold text-white">{formatPlanPrice(plan.price)}</p>
      <p className="mt-1 text-sm text-zinc-500">{plan.durationDays} days access</p>
      <p className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
        <Users className="h-4 w-4 text-zinc-500" />
        {plan.activeSubscribers} active subscribers
      </p>
      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 rounded-lg border border-white/10 bg-[#1f1f1f] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#2a2a2a]"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-white/10 bg-[#1f1f1f] p-2.5 text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
          aria-label={`Delete ${plan.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

export function MembershipPlansPanel() {
  const plans = useOwnerMembershipPlansStore((state) => state.plans);
  const addPlan = useOwnerMembershipPlansStore((state) => state.addPlan);
  const updatePlan = useOwnerMembershipPlansStore((state) => state.updatePlan);
  const deletePlan = useOwnerMembershipPlansStore((state) => state.deletePlan);

  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function parseForm(values: PlanFormValues) {
    const error = validateForm(values);
    if (error) return { error, data: null };

    return {
      error: null,
      data: {
        name: values.name.trim(),
        price: Number(values.price),
        durationDays: Number(values.durationDays),
      },
    };
  }

  function handleCreate(values: PlanFormValues) {
    const { error, data } = parseForm(values);
    if (error || !data) return error;
    addPlan(data);
    setShowNewForm(false);
    return null;
  }

  function handleSave(id: string, values: PlanFormValues) {
    const { error, data } = parseForm(values);
    if (error || !data) return error;
    updatePlan(id, data);
    setEditingId(null);
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-white">Membership Plans</h2>
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setShowNewForm(true);
          }}
          disabled={showNewForm}
          className="inline-flex items-center gap-2 rounded-lg bg-[#FFD700] px-4 py-2.5 text-sm font-bold text-black transition hover:bg-[#e6c200] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add Plan
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {showNewForm ? (
          <NewPlanCard
            onCancel={() => setShowNewForm(false)}
            onCreate={handleCreate}
          />
        ) : null}

        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isEditing={editingId === plan.id}
            onEdit={() => {
              setShowNewForm(false);
              setEditingId(plan.id);
            }}
            onCancelEdit={() => setEditingId(null)}
            onSave={(values) => handleSave(plan.id, values)}
            onDelete={() => deletePlan(plan.id)}
          />
        ))}
      </div>

      {plans.length === 0 && !showNewForm ? (
        <p className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-zinc-500">
          No membership plans yet. Click Add Plan to create your first one.
        </p>
      ) : null}
    </div>
  );
}
