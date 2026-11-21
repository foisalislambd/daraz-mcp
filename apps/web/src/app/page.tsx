import { adminConfig } from "@/config/admin.config";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-xl font-bold text-white">
          {adminConfig.brand.letter}
        </span>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {adminConfig.brand.name}
        </h1>
        <p className="mt-3 text-gray-600 dark:text-gray-400">
          Hosted MCP for Daraz sellers. Connect a shop, copy an API key, and use it from Claude, Cursor, or VS Code.
          Not affiliated with Daraz.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/admin/login"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-6 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Sign in
          </Link>
          <Link
            href="/admin/signup"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 px-6 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-100"
          >
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}
