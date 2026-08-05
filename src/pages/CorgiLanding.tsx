import React, { useEffect, useRef, useState } from "react"
import { ArrowRight, Heart, LoaderCircle, MapPin, X } from "lucide-react"

const theme = {
  accent: "#ff5c00",
  peach: "#ffc9a3",
}

export default function CorgiLanding() {
  const [gateState, setGateState] = useState<"idle" | "checking" | "name" | "outside" | "denied" | "error">("idle")
  const [ownerAccess, setOwnerAccess] = useState(false)
  const [name, setName] = useState("")
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setName(localStorage.getItem("corgi-name") || "")
  }, [])

  useEffect(() => {
    if (gateState === "name") nameRef.current?.focus()
  }, [gateState])

  async function verifyCoordinates(latitude: number, longitude: number) {
    const coordinates = { lat: latitude, lng: longitude }
    const query = new URLSearchParams({ lat: String(latitude), lng: String(longitude) })
    const response = await fetch(`/api/corgi/presence?${query}`, { headers: { Accept: "application/json" } })
    if (!response.ok) throw new Error("location-check-failed")
    const data = await response.json() as { presence: { allowed: boolean } }
    if (!data.presence.allowed) {
      sessionStorage.removeItem("corgi-geo")
      setGateState("outside")
      return
    }
    sessionStorage.setItem("corgi-geo", JSON.stringify(coordinates))
    setOwnerAccess(false)
    setGateState("name")
  }

  async function checkLocation() {
    setGateState("checking")
    try {
      const response = await fetch("/api/corgi/presence", { headers: { Accept: "application/json" } })
      if (response.ok) {
        const data = await response.json() as { presence: { allowed: boolean }; ownerAccess?: boolean }
        if (data.presence.allowed) {
          setOwnerAccess(Boolean(data.ownerAccess))
          setGateState("name")
          return
        }
      }
    } catch {}
    if (!navigator.geolocation) {
      setGateState("error")
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => void verifyCoordinates(coords.latitude, coords.longitude).catch(() => setGateState("error")),
      (error) => setGateState(error.code === error.PERMISSION_DENIED ? "denied" : "error"),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    )
  }

  function enterChat() {
    const cleanName = name.trim()
    if (!cleanName) {
      nameRef.current?.focus()
      return
    }
    localStorage.setItem("corgi-name", cleanName.slice(0, 30))
    window.location.assign("/chat")
  }

  const style = {
    "--corgi-accent": theme.accent,
    "--corgi-peach": theme.peach,
  } as React.CSSProperties

  return (
    <main style={style} className="min-h-dvh overflow-x-hidden bg-[#e96625] text-white selection:bg-[var(--corgi-peach)]">
      <section
        aria-labelledby="corgi-title"
        className="relative flex min-h-dvh items-center overflow-hidden bg-cover bg-[position:62%_center] px-5 py-12 sm:bg-right sm:px-8 sm:py-20"
        style={{ backgroundImage: "url('/images/corgi-hero.webp')" }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#e96625]/90 via-[#e96625]/55 to-transparent sm:hidden" />

        <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-black tracking-[0.08em] text-[#241a12] shadow-lg sm:right-8 sm:top-8 sm:gap-2 sm:px-4 sm:py-2 sm:text-xs">
          <span className="size-2 animate-pulse rounded-full bg-[var(--corgi-accent)]" />
          LIVE
        </div>

        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <div className="max-w-4xl">
            <h1 id="corgi-title" className="text-[clamp(4rem,18vw,10.5rem)] font-black leading-[0.76] tracking-[-0.085em] text-white">
              CORGI<br />
              <span className="inline-flex items-end">
                CHAT
                <span aria-hidden className="relative mb-[0.06em] ml-[0.12em] inline-grid size-[0.34em] -rotate-6 place-items-center rounded-[0.1em] bg-[var(--corgi-accent)] shadow-[0_0.04em_0.1em_rgba(36,26,18,0.2)]">
                  <span className="absolute -bottom-[0.035em] left-[0.055em] size-[0.09em] rotate-45 bg-[var(--corgi-accent)]" />
                  <Heart className="relative z-10 size-[0.19em] text-white" fill="currentColor" strokeWidth={2.5} />
                </span>
              </span>
            </h1>
            <p className="mt-8 max-w-xl text-lg font-semibold leading-snug text-[#241a12] sm:text-2xl">
              The chatroom for the only 24/7 cafe in San Francisco.
            </p>
            <div className="mt-6 flex flex-col items-start gap-4 sm:mt-9">
              <button
                type="button"
                onClick={() => void checkLocation()}
                className="group inline-flex min-h-12 items-center gap-2.5 rounded-full bg-[#241a12] px-6 text-sm font-black text-white shadow-[0_12px_28px_rgba(36,26,18,0.22)] transition hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(36,26,18,0.25)] active:translate-y-0 sm:min-h-14 sm:gap-3 sm:px-7 sm:text-base"
              >
                Join the chat
                <ArrowRight size={20} className="text-[var(--corgi-accent)] transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-5 bottom-5 z-10 flex flex-col gap-1.5 text-[11px] font-semibold text-[#241a12]/80 sm:inset-x-8 sm:bottom-7 sm:flex-row sm:items-center sm:gap-4 sm:text-sm">
          <a href="https://www.google.com/maps/search/?api=1&query=9+Claude+Lane+San+Francisco" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:underline"><MapPin size={14} />9 Claude Lane, San Francisco</a>
          <span className="hidden size-1.5 rounded-full bg-[#241a12]/60 sm:block" />
          <span className="inline-flex items-center gap-1.5"><MapPin size={14} />2146 3rd St, San Francisco · Coming soon</span>
          <span className="hidden size-1.5 rounded-full bg-[#241a12]/60 sm:block" />
          <span className="italic font-medium text-[#241a12]/65">Not associated with Corgi</span>
        </div>
      </section>

      {gateState !== "idle" && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#241a12]/35 p-4 backdrop-blur-sm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="gate-title" className="relative w-full max-w-md rounded-[28px] border-2 border-[#241a12] bg-white p-6 text-[#241a12] shadow-[0_10px_0_#241a12,0_30px_80px_rgba(36,26,18,0.3)] sm:p-8">
            {gateState !== "checking" && <button type="button" onClick={() => setGateState("idle")} aria-label="Close" className="absolute right-4 top-4 grid size-9 place-items-center rounded-full hover:bg-black/5"><X size={18} /></button>}
            {gateState === "checking" && <><LoaderCircle className="size-9 animate-spin text-[var(--corgi-accent)]" /><h2 id="gate-title" className="mt-5 text-3xl font-black tracking-[-0.04em]">Checking your location</h2><p className="mt-2 text-sm leading-6 text-[#241a12]/65">Allow location access so we can confirm you’re at Corgi Cafe.</p></>}
            {gateState === "name" && <form onSubmit={(event) => { event.preventDefault(); enterChat() }}><span className="inline-flex items-center gap-2 rounded-full bg-[#e8f7ed] px-3 py-1.5 text-xs font-bold text-[#18733a]"><span className="size-2 rounded-full bg-[#24a052]" />{ownerAccess ? "Creator access" : "You’re at Corgi"}</span><h2 id="gate-title" className="mt-5 text-3xl font-black tracking-[-0.04em]">What should we call you?</h2><label className="mt-5 block text-xs font-bold uppercase tracking-[0.08em]" htmlFor="corgi-name">Your name</label><input ref={nameRef} id="corgi-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={30} required placeholder="Danny" className="mt-2 h-13 w-full rounded-xl border-2 border-[#241a12] px-4 text-base outline-none focus:ring-4 focus:ring-[var(--corgi-peach)]" /><button type="submit" className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#241a12] bg-[var(--corgi-accent)] font-black text-white shadow-[0_5px_0_#241a12] active:translate-y-[5px] active:shadow-none">Enter the chat <ArrowRight size={18} /></button></form>}
            {gateState === "outside" && <><MapPin className="size-9 text-[var(--corgi-accent)]" /><h2 id="gate-title" className="mt-5 text-3xl font-black tracking-[-0.04em]">This chatroom lives at Corgi</h2><p className="mt-2 text-sm leading-6 text-[#241a12]/65">You need to be at 9 Claude Lane to enter. If you’re already there, move closer to a window and try again.</p><button type="button" onClick={() => void checkLocation()} className="mt-5 h-12 w-full rounded-xl border-2 border-[#241a12] bg-[var(--corgi-accent)] font-black text-white shadow-[0_5px_0_#241a12] active:translate-y-[5px] active:shadow-none">Try again</button></>}
            {gateState === "denied" && <><MapPin className="size-9 text-[var(--corgi-accent)]" /><h2 id="gate-title" className="mt-5 text-3xl font-black tracking-[-0.04em]">Location access is off</h2><p className="mt-2 text-sm leading-6 text-[#241a12]/65">Enable location for this site in your browser settings, then try again.</p><button type="button" onClick={() => void checkLocation()} className="mt-5 h-12 w-full rounded-xl border-2 border-[#241a12] bg-[var(--corgi-accent)] font-black text-white shadow-[0_5px_0_#241a12] active:translate-y-[5px] active:shadow-none">Try again</button></>}
            {gateState === "error" && <><MapPin className="size-9 text-[var(--corgi-accent)]" /><h2 id="gate-title" className="mt-5 text-3xl font-black tracking-[-0.04em]">We couldn’t check your location</h2><p className="mt-2 text-sm leading-6 text-[#241a12]/65">Check your connection and location settings, then give it another try.</p><button type="button" onClick={() => void checkLocation()} className="mt-5 h-12 w-full rounded-xl border-2 border-[#241a12] bg-[var(--corgi-accent)] font-black text-white shadow-[0_5px_0_#241a12] active:translate-y-[5px] active:shadow-none">Try again</button></>}
          </section>
        </div>
      )}
    </main>
  )
}
