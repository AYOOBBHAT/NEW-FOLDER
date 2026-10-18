"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <form
      className="form-grid"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        const response = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setSaving(false);
        if (!response.ok) {
          setError(body.error || "Could not sign in.");
          return;
        }
        router.push("/admin");
        router.refresh();
      }}
    >
      <label className="field">
        <span>Email</span>
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required />
      </label>
      <label className="field">
        <span>Password</span>
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <button className="button" type="submit" disabled={saving}>
        {saving ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
