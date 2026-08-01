import React from "react"
import { ArrowRight, Heart, MapPin } from "lucide-react"

const theme = {
  accent: "#ff5c00",
  peach: "#ffc9a3",
}

export default function CorgiLanding() {
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
            <a
              href="https://www.google.com/maps/search/?api=1&query=9+Claude+Lane+San+Francisco"
              target="_blank"
              rel="noopener noreferrer"
              className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#241a12] underline-offset-4 hover:underline sm:mb-5 sm:gap-2 sm:text-base"
            >
              <MapPin size={18} strokeWidth={2.5} />
              <span className="sm:hidden">9 Claude Ln</span>
              <span className="hidden sm:inline">9 Claude Lane · San Francisco</span>
            </a>
            <h1 id="corgi-title" className="text-[clamp(4rem,18vw,10.5rem)] font-black leading-[0.76] tracking-[-0.085em] text-white">
              CORGI<br />
              <span className="inline-flex items-end">
                CHAT.
                <span aria-hidden className="relative mb-[0.06em] ml-[0.12em] inline-grid size-[0.34em] -rotate-6 place-items-center rounded-[0.1em] bg-[var(--corgi-accent)] shadow-[0_0.04em_0.1em_rgba(36,26,18,0.2)]">
                  <span className="absolute -bottom-[0.035em] left-[0.055em] size-[0.09em] rotate-45 bg-[var(--corgi-accent)]" />
                  <Heart className="relative z-10 size-[0.19em] text-white" fill="currentColor" strokeWidth={2.5} />
                </span>
              </span>
            </h1>
            <p className="mt-8 hidden max-w-xl text-lg font-semibold leading-snug text-[#241a12] sm:block sm:text-2xl">
              The neighborhood chat room you can read anywhere and join only at the cafe.
            </p>
            <div className="mt-6 flex flex-col items-start gap-4 sm:mt-9 sm:flex-row sm:items-center">
              <a
                href="/corgi/chat"
                className="group inline-flex min-h-12 items-center gap-2.5 rounded-full bg-[#241a12] px-6 text-sm font-black text-white shadow-[0_12px_28px_rgba(36,26,18,0.22)] transition hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(36,26,18,0.25)] active:translate-y-0 sm:min-h-14 sm:gap-3 sm:px-7 sm:text-base"
              >
                Join the chat
                <ArrowRight size={20} className="text-[var(--corgi-accent)] transition-transform group-hover:translate-x-1" />
              </a>
              <p className="hidden text-sm font-medium leading-snug text-[#241a12]/80 sm:block">Open 24/7 · posting unlocks in person</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
