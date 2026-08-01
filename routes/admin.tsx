import React, { useCallback, useEffect, useState } from "react"
import { MapPin, Network, Shield, Trash2 } from "lucide-react"

const theme = {
  background: "#f6f6f6",
  surface: "#ffffff",
  surfaceWarm: "#ffdecc",
  surfaceStrong: "#ffc9a3",
  border: "#e1e1e1",
  text: "#191919",
  body: "#4a4a4a",
  muted: "#7b7b7b",
  accent: "#ff5c00",
  accentDark: "#cc4a00",
  accentLight: "#ff7d33",
  danger: "#b42318",
  success: "#cc4a00",
}

type Location = { lat: number; lng: number; radiusM: number; isDefault: boolean }
type Config = {
  claimed: boolean
  networkCount: number
  location: Location
  envSecret: boolean
}
type Results = Record<string, { ok: boolean; text: string }>

export default function CorgiAdmin() {
  const [secret, setSecret] = useState("")
  const [radius, setRadius] = useState(150)
  const [config, setConfig] = useState<Config | null>(null)
  const [results, setResults] = useState<Results>({})
  const [busy, setBusy] = useState("")

  const loadConfig = useCallback(async () => {
    try {
      const response = await fetch("/api/corgi/config", {
        headers: { Accept: "application/json" },
      })
      if (!response.ok) throw new Error("Status unavailable")
      setConfig((await response.json()) as Config)
    } catch {
      setResults((current) => ({ ...current, status: { ok: false, text: "Status unavailable" } }))
    }
  }, [])

  useEffect(() => {
    setSecret(localStorage.getItem("corgi-admin-secret") || "")
    void loadConfig()
  }, [loadConfig])

  function saveSecret(value: string) {
    setSecret(value)
    localStorage.setItem("corgi-admin-secret", value)
  }

  async function runOperation(
    op: "register_ip" | "forget_ips" | "set_location" | "clear_location" | "clear_chat",
    values: Record<string, number> = {},
  ) {
    setBusy(op)
    try {
      const response = await fetch("/api/corgi/admin", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ secret, op, ...values }),
      })
      const data = (await response.json()) as { ok?: boolean; ip?: string; error?: string }
      if (!response.ok) throw new Error(data.error || "Operation failed")
      const text = op === "register_ip" ? `Registered ${data.ip}` : "Done"
      setResults((current) => ({ ...current, [op]: { ok: true, text } }))
    } catch (error) {
      const text = error instanceof Error ? error.message : "Operation failed"
      setResults((current) => ({ ...current, [op]: { ok: false, text } }))
    } finally {
      await loadConfig()
      setBusy("")
    }
  }

  function setCurrentLocation() {
    setBusy("set_location")
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        void runOperation("set_location", {
          lat: coords.latitude,
          lng: coords.longitude,
          radiusM: radius,
        })
      },
      () => {
        setResults((current) => ({
          ...current,
          set_location: { ok: false, text: "Location permission or position unavailable" },
        }))
        setBusy("")
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  const style = {
    "--corgi-bg": theme.background,
    "--corgi-surface": theme.surface,
    "--corgi-warm": theme.surfaceWarm,
    "--corgi-peach": theme.surfaceStrong,
    "--corgi-border": theme.border,
    "--corgi-text": theme.text,
    "--corgi-body": theme.body,
    "--corgi-muted": theme.muted,
    "--corgi-accent": theme.accent,
    "--corgi-accent-dark": theme.accentDark,
    "--corgi-accent-light": theme.accentLight,
    "--corgi-danger": theme.danger,
    "--corgi-success": theme.success,
  } as React.CSSProperties

  const result = (op: string) => {
    const item = results[op]
    return item ? (
      <p className={`mt-2 text-sm ${item.ok ? "text-[var(--corgi-success)]" : "text-[var(--corgi-danger)]"}`}>
        {item.ok ? "✓" : "×"} {item.text}
      </p>
    ) : null
  }

  const buttonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--corgi-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--corgi-accent-dark)] disabled:opacity-50"
  const secondaryButtonClass =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--corgi-border)] bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-[var(--corgi-warm)] disabled:opacity-50"

  return (
    <main style={style} className="min-h-dvh bg-[var(--corgi-bg)] px-4 py-8 text-[var(--corgi-body)] sm:px-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <header>
          <p className="text-sm font-semibold text-[var(--corgi-accent-dark)]">🐾 Owner tools</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--corgi-text)]">Corgi Cafe Wall Admin</h1>
          <a href="/corgi" className="mt-2 inline-block text-sm font-medium text-[var(--corgi-accent)] underline">
            Back to the wall
          </a>
        </header>

        <section className="rounded-2xl border border-[var(--corgi-border)] bg-[var(--corgi-surface)] p-5 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-[var(--corgi-text)]"><Shield size={18} /> Admin passphrase</div>
          <input
            type="password"
            value={secret}
            onChange={(event) => saveSecret(event.target.value)}
            autoComplete="current-password"
            placeholder="Passphrase"
            className="mt-3 w-full rounded-xl border border-[var(--corgi-border)] bg-white px-3 py-2.5 outline-none focus:ring-2 focus:ring-[var(--corgi-accent)]"
          />
          <p className="mt-2 text-sm leading-relaxed text-[var(--corgi-muted)]">
            First passphrase entered claims admin. Set CORGI_ADMIN_SECRET in Zo Settings → Advanced to override.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--corgi-border)] bg-[var(--corgi-surface)] p-5 shadow-sm">
          <h2 className="font-bold text-[var(--corgi-text)]">Status</h2>
          {config ? (
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm">
              <dt className="text-[var(--corgi-muted)]">Claimed</dt>
              <dd>{config.claimed ? "Yes" : "No"}</dd>
              <dt className="text-[var(--corgi-muted)]">Networks</dt>
              <dd>{config.networkCount}</dd>
              <dt className="text-[var(--corgi-muted)]">Location</dt>
              <dd className="flex flex-wrap items-center gap-2">
                <span>{config.location.lat.toFixed(6)}, {config.location.lng.toFixed(6)} · {config.location.radiusM}m</span>
                <span className="rounded-full bg-[var(--corgi-warm)] px-2 py-0.5 text-xs font-semibold text-[var(--corgi-accent-dark)]">
                  {config.location.isDefault ? "default (9 Claude Ln, SF)" : "custom"}
                </span>
              </dd>
              <dt className="text-[var(--corgi-muted)]">Env secret</dt>
              <dd>{config.envSecret ? "Active" : "Not set"}</dd>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-[var(--corgi-muted)]">Loading…</p>
          )}
          {result("status")}
        </section>

        <section className="rounded-2xl border border-[var(--corgi-border)] bg-[var(--corgi-surface)] p-5 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-[var(--corgi-text)]"><MapPin size={18} className="text-[var(--corgi-accent)]" /> Cafe location</div>
          <label className="mt-3 block text-sm text-[var(--corgi-muted)]">
            Radius in meters
            <input
              type="number"
              min={20}
              max={1000}
              value={radius}
              onChange={(event) => setRadius(Number(event.target.value))}
              className="mt-1 block w-32 rounded-xl border border-[var(--corgi-border)] bg-white px-3 py-2 text-[var(--corgi-text)] outline-none focus:ring-2 focus:ring-[var(--corgi-accent)]"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={setCurrentLocation} disabled={Boolean(busy)} className={buttonClass}>
              Set cafe location to where I'm standing
            </button>
            <button
              type="button"
              onClick={() => void runOperation("clear_location")}
              disabled={Boolean(busy)}
              className={secondaryButtonClass}
            >
              Reset to default location
            </button>
          </div>
          {result("set_location")}
          {result("clear_location")}
        </section>

        <details className="rounded-2xl border border-[var(--corgi-border)] bg-[var(--corgi-surface)] p-5 shadow-sm">
          <summary className="flex cursor-pointer items-center gap-2 font-bold text-[var(--corgi-text)]">
            <Network size={18} /> Optional: cafe Wi-Fi fast-path
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-[var(--corgi-muted)]">
            Registering the cafe network's IP lets people on cafe Wi-Fi post without a location prompt.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runOperation("register_ip")}
              disabled={Boolean(busy)}
              className={buttonClass}
            >
              Register this network
            </button>
            <button
              type="button"
              onClick={() => void runOperation("forget_ips")}
              disabled={Boolean(busy)}
              className={secondaryButtonClass}
            >
              Forget all networks
            </button>
          </div>
          {result("register_ip")}
          {result("forget_ips")}
        </details>

        <section className="rounded-2xl border border-[var(--corgi-border)] bg-[var(--corgi-surface)] p-5 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-[var(--corgi-text)]"><Trash2 size={18} /> Chat history</div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Clear every message from the Corgi Cafe Wall?")) void runOperation("clear_chat")
            }}
            disabled={Boolean(busy)}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[var(--corgi-danger)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Clear chat
          </button>
          {result("clear_chat")}
        </section>
      </div>
    </main>
  )
}
