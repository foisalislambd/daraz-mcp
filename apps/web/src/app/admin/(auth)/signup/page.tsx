"use client";

import { useAdminAuth } from "@/components/admin/auth/admin-auth-provider";
import { AdminThemeToggle } from "@/components/admin/ui/admin-theme-toggle";
import { adminConfig } from "@/config/admin.config";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const inputClass =
  "h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900";

export default function SignupPage() {
  const { signup } = useAdminAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signup(name, email, password);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-dvh">
      <div className="absolute top-4 right-4">
        <AdminThemeToggle />
      </div>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5">
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 font-bold text-white">
          {adminConfig.brand.letter}
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Create an account</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input className={inputClass} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className={inputClass} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className={inputClass} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="text-sm text-error-500">{error}</p>}
          <button disabled={submitting} className="h-11 w-full rounded-lg bg-brand-500 text-sm font-semibold text-white" type="submit">
            {submitting ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-sm text-gray-500">
          Already registered?{" "}
          <Link className="font-medium text-brand-600" href="/admin/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
