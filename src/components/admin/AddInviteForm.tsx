"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { inviteSchema, type InviteRole } from "@/lib/invites";
import { cn } from "@/lib/utils";

export function AddInviteForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("member");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [message, setMessage] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "sending">("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;

    setMessage(null);
    const parsed = inviteSchema.safeParse({ name, email, role });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
      });
      return;
    }

    setErrors({});
    setState("sending");

    try {
      const response = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const body = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };

      if (!response.ok || !body.ok) {
        setMessage(body.message || "couldn't add that.");
        return;
      }

      setName("");
      setEmail("");
      setRole("member");
      setMessage("added. they can sign in with that email now.");
      router.refresh();
    } catch {
      setMessage("couldn't add that.");
    } finally {
      setState("idle");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-widest text-muted">Name</label>
        <input
          type="text"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Full name"
          maxLength={120}
          className={cn(
            "w-full px-4 py-3 border rounded-lg text-sm bg-card outline-none transition",
            errors.name ? "border-red-300 bg-red-50" : "border-border focus:border-primary focus:ring-1 focus:ring-primary/30"
          )}
        />
        {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
      </div>

      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-widest text-muted">Email</label>
        <input
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
          className={cn(
            "w-full px-4 py-3 border rounded-lg text-sm bg-card outline-none transition",
            errors.email ? "border-red-300 bg-red-50" : "border-border focus:border-primary focus:ring-1 focus:ring-primary/30"
          )}
        />
        {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
      </div>

      {message && (
        <div className={cn(
          "p-3 rounded-lg text-sm",
          message.includes("added")
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-red-50 text-red-700 border border-red-200"
        )}>
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={state === "sending" || !name.trim() || !email.trim()}
        className="w-full px-4 py-3 bg-primary text-primary-foreground font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90"
      >
        {state === "sending" ? "Adding…" : "Add Member"}
      </button>
    </form>
  );
}
