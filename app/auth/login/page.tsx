import Link from "next/link";
import { LOGIN_VARIANTS } from "./login-variants";

export default function LoginHubPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">Choose your login page</h1>
        <p className="text-muted-foreground mt-2">Select your access level to continue.</p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LOGIN_VARIANTS.map((variant) => (
            <Link key={variant.slug} href={`/auth/login/${variant.slug}`} className="rounded-lg border p-4 hover:bg-muted/40">
              <p className="font-semibold">{variant.label}</p>
              <p className="text-sm text-muted-foreground">{variant.description}</p>
            </Link>
          ))}
        </div>
        <div className="mt-6">
          <Link href="/auth/forgot-password" className="text-brand-600 hover:underline">Forgot password?</Link>
        </div>
      </div>
    </div>
  );
}
