import Link from "next/link";

export const runtime = "edge";
export const metadata = { title: "Unauthorized" };

export default function UnauthorizedPage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  const reason = searchParams.reason;
  const details =
    reason === "missing_profile"
      ? "Your account is authenticated, but no user profile was found."
      : reason === "role_denied"
        ? "Your account is signed in, but your role does not have access to this area."
        : "You do not have permission to access this page.";

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-lg w-full rounded-xl border bg-card shadow-sm p-6 space-y-4">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="text-muted-foreground">{details}</p>
        <p className="text-sm text-muted-foreground">
          Please contact your System Administrator if this appears to be a mistake.
        </p>
        <div className="flex gap-3">
          <Link className="rounded-md bg-brand-500 text-white px-4 py-2 text-sm font-medium" href="/dashboard">
            Go to dashboard
          </Link>
          <Link className="rounded-md border px-4 py-2 text-sm font-medium" href="/auth/login">
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
