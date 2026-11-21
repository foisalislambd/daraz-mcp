"use client";

import { useAdminAuth } from "@/components/admin/auth/admin-auth-provider";
import { FormEvent, useState } from "react";

const inputClass =
  "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900";

export default function SettingsPage() {
  const { admin } = useAdminAuth();
  const [name, setName] = useState(admin?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || "Could not save");
      return;
    }
    setMessage("Saved.");
    setCurrentPassword("");
    setNewPassword("");
  }

  return (
    <div className="admin-content space-y-5">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h1>
      <form onSubmit={save} className="admin-card admin-card-body max-w-xl space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Name</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email</label>
          <input className={inputClass} value={admin?.email || ""} disabled />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Current password</label>
          <input className={inputClass} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">New password</label>
          <input className={inputClass} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-error-500">{error}</p>}
        {message && <p className="text-sm text-success-600">{message}</p>}
        <button className="h-11 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white" type="submit">
          Save profile
        </button>
      </form>
    </div>
  );
}
