import React, { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, Bold, Code2, Info, Italic, Link, MapPin, Send, Wifi, X } from "lucide-react"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8?bundle"

const SUPABASE_URL = "https://zjwuybogjgljeueurffg.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpqd3V5Ym9namdsamV1ZXVyZmZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NTg5NjQsImV4cCI6MjEwMTEzNDk2NH0.xWWod1O45o-t5_N-9YCK1sFELpvJVEPoD5PYfM8aTPY"

const theme = {
  background: "#f6f6f6",
  surface: "#ffffff",
  border: "#e1e1e1",
  text: "#191919",
  body: "#4a4a4a",
  muted: "#7b7b7b",
  accent: "#ff5c00",
  accentDark: "#cc4a00",
}

type Message = {
  id: string
  name: string
  text: string
  ts: number
  via: "wifi" | "geo"
  pending?: boolean
  failed?: boolean
}

type SupabaseMessage = {
  id: string
  name: string
  text: string
  created_at: string
  via: "wifi" | "geo"
}

type MessagesResponse = {
  messages: Message[]
  presence: { allowed: boolean; via: "wifi" | "geo" | null }
  configured: boolean
}

type SendResponse = {
  ok: true
  message: Message
}

type Coordinates = { lat: number; lng: number }

function storedCoordinates(): Coordinates | null {
  try {
    const value = sessionStorage.getItem("corgi-geo")
    if (!value) return null
    const parsed = JSON.parse(value) as Coordinates
    return Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng) ? parsed : null
  } catch {
    return null
  }
}

function sessionId(): string {
  const existing = sessionStorage.getItem("corgi-session-id")
  if (existing) return existing
  const browserId = localStorage.getItem("corgi-browser-id") || crypto.randomUUID()
  localStorage.setItem("corgi-browser-id", browserId)
  sessionStorage.setItem("corgi-session-id", browserId)
  return browserId
}

function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const byId = new Map(current.map((message) => [message.id, message]))
  for (const message of incoming) byId.set(message.id, message)
  return [...byId.values()].sort((a, b) => a.ts - b.ts).slice(-100)
}

const URL_PATTERN = /\b(?:https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.(?:com|org|net|io|co|app|dev|me|gg|xyz|cafe|social|chat|news|ai|edu|gov)(?:\/[^\s<>"']*)?)/gi

type MessageTextToken = {
  type: "plain" | "bold" | "italic" | "strike" | "code"
  text: string
}

function tokenizeMessageText(text: string): MessageTextToken[] {
  const tokens: MessageTextToken[] = []
  const codePattern = /`([^`\n]+)`/g
  const formattingPattern = /(\*\*([^*\n]+)\*\*|~~([^~\n]+)~~|\*([^*\n]+)\*|_([^_\n]+)_)/g

  function tokenizePlainSegment(segment: string) {
    let lastIndex = 0
    for (const match of segment.matchAll(formattingPattern)) {
      const start = match.index ?? 0
      if (start > lastIndex) tokens.push({ type: "plain", text: segment.slice(lastIndex, start) })
      if (match[2] !== undefined) tokens.push({ type: "bold", text: match[2] })
      else if (match[3] !== undefined) tokens.push({ type: "strike", text: match[3] })
      else tokens.push({ type: "italic", text: match[4] ?? match[5] })
      lastIndex = start + match[0].length
    }
    if (lastIndex < segment.length) tokens.push({ type: "plain", text: segment.slice(lastIndex) })
  }

  let lastIndex = 0
  for (const match of text.matchAll(codePattern)) {
    const start = match.index ?? 0
    if (start > lastIndex) tokenizePlainSegment(text.slice(lastIndex, start))
    tokens.push({ type: "code", text: match[1] })
    lastIndex = start + match[0].length
  }
  if (lastIndex < text.length) tokenizePlainSegment(text.slice(lastIndex))
  return tokens
}

function linkifyMessageText(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  const combinedPattern = new RegExp(`\\[([^\\]\\n]+)\\]\\((https?:\\/\\/[^\\s<>"]+)\\)|${URL_PATTERN.source}`, "gi")
  for (const match of text.matchAll(combinedPattern)) {
    const start = match.index ?? 0
    if (start > lastIndex) nodes.push(text.slice(lastIndex, start))
    if (match[1] && match[2]) {
      nodes.push(
        <a key={`${keyPrefix}-${start}-markdown`} href={match[2]} target="_blank" rel="noopener noreferrer nofollow" className="break-words font-medium text-[#ff5c00] underline decoration-1 underline-offset-2 hover:text-[#cc4a00]">
          {match[1]}
        </a>,
      )
      lastIndex = start + match[0].length
      continue
    }
    const raw = match[0]
    const trimmed = raw.replace(/[.,!?;:)]+$/, "")
    if (!trimmed) continue
    const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    nodes.push(
      <a key={`${keyPrefix}-${start}-${trimmed}`} href={href} target="_blank" rel="noopener noreferrer nofollow" className="break-all font-medium text-[#ff5c00] underline decoration-1 underline-offset-2 hover:text-[#cc4a00]">
        {trimmed}
      </a>,
    )
    lastIndex = start + raw.length
    if (trimmed.length < raw.length) nodes.push(raw.slice(trimmed.length))
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

function renderInlineMessageText(text: string): React.ReactNode[] {
  return tokenizeMessageText(text).map((token, index) => {
    const key = `${token.type}-${index}`
    if (token.type === "code") return <code key={key} className="rounded bg-[#f1f1f1] px-1.5 py-0.5 font-mono text-[0.9em] text-[#191919]">{token.text}</code>
    const content = linkifyMessageText(token.text, key)
    if (token.type === "bold") return <strong key={key} className="font-bold text-[#191919]">{content}</strong>
    if (token.type === "italic") return <em key={key} className="italic">{content}</em>
    if (token.type === "strike") return <s key={key} className="line-through opacity-70">{content}</s>
    return <React.Fragment key={key}>{content}</React.Fragment>
  })
}

function renderMessageText(text: string): React.ReactNode {
  const lines = text.split("\n")
  const blocks: React.ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (line.startsWith("```")) {
      const language = line.slice(3).trim()
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index])
        index += 1
      }
      blocks.push(
        <pre key={`code-${index}`} className="my-2 overflow-x-auto rounded-xl bg-[#191919] px-4 py-3 text-sm leading-relaxed text-white">
          {language && <span className="mb-2 block text-[10px] text-white/40">{language.toLowerCase()}</span>}
          <code>{codeLines.join("\n")}</code>
        </pre>,
      )
      index += 1
      continue
    }

    const listMatch = line.match(/^\s*[-*]\s+(.+)/)
    if (listMatch) {
      const items: string[] = []
      while (index < lines.length) {
        const match = lines[index].match(/^\s*[-*]\s+(.+)/)
        if (!match) break
        items.push(match[1])
        index += 1
      }
      blocks.push(<ul key={`list-${index}`} className="my-1.5 list-disc space-y-1 pl-5">{items.map((item, itemIndex) => <li key={itemIndex}>{renderInlineMessageText(item)}</li>)}</ul>)
      continue
    }

    if (line.startsWith("> ")) {
      blocks.push(<blockquote key={`quote-${index}`} className="my-2 border-l-4 border-[#ff5c00] pl-3 italic text-[#7b7b7b]">{renderInlineMessageText(line.slice(2))}</blockquote>)
    } else if (line === "") {
      blocks.push(<span key={`break-${index}`} className="block h-2" />)
    } else {
      blocks.push(<span key={`line-${index}`} className="block">{renderInlineMessageText(line)}</span>)
    }
    index += 1
  }

  return blocks
}

function relativeTime(timestamp: number): string {
  const elapsed = Math.max(0, Date.now() - timestamp)
  if (elapsed < 60_000) return "just now"
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`
  return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

export default function CorgiGuestbook() {
  const [messages, setMessages] = useState<Message[]>([])
  const [allowed, setAllowed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [rangeNote, setRangeNote] = useState("")
  const [locating, setLocating] = useState(false)
  const [name, setName] = useState("")
  const [text, setText] = useState("")
  const [viewerCount, setViewerCount] = useState(0)
  const [infoOpen, setInfoOpen] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const nearBottomRef = useRef(true)

  const loadMessages = useCallback(async (coordinates = storedCoordinates()) => {
    try {
      const query = new URLSearchParams()
      if (coordinates) {
        query.set("lat", String(coordinates.lat))
        query.set("lng", String(coordinates.lng))
      }
      const suffix = query.size ? `?${query.toString()}` : ""
      const response = await fetch(`/api/corgi/messages${suffix}`, {
        headers: { Accept: "application/json" },
      })
      if (!response.ok) throw new Error("messages unavailable")
      const data = (await response.json()) as MessagesResponse
      setMessages(data.messages)
      setAllowed(data.presence.allowed)
      setLoaded(true)
      setReconnecting(false)
      return data.presence.allowed
    } catch {
      setReconnecting(true)
      return null
    }
  }, [])

  useEffect(() => {
    setName(localStorage.getItem("corgi-name") || "")
    void loadMessages()
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const channel = supabase.channel("corgi-room", {
      config: { presence: { key: sessionId() } },
    })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "corgi_messages" },
        (payload) => {
          const row = payload.new as SupabaseMessage
          setMessages((current) => mergeMessages(current, [{
            id: row.id,
            name: row.name,
            text: row.text,
            ts: new Date(row.created_at).getTime(),
            via: row.via,
          }]))
        },
      )
      .on("presence", { event: "sync" }, () => {
        setViewerCount(Object.keys(channel.presenceState()).length)
      })
      .on("broadcast", { event: "clear" }, () => setMessages([]))
      .subscribe(async (status) => {
        const connected = status === "SUBSCRIBED"
        setReconnecting(!connected)
        if (connected) await channel.track({ online_at: new Date().toISOString() })
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadMessages])

  useEffect(() => {
    if (nearBottomRef.current) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
    }
  }, [messages])

  function saveName(value: string) {
    setName(value)
    localStorage.setItem("corgi-name", value)
  }

  async function postMessage(localId: string, messageName: string, messageText: string) {
    try {
      const coordinates = storedCoordinates()
      const response = await fetch("/api/corgi/messages", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ name: messageName, text: messageText, ...coordinates }),
      })
      if (!response.ok) throw new Error("send failed")
      const data = (await response.json()) as SendResponse
      setMessages((current) => mergeMessages(
        current.filter((message) => message.id !== localId),
        [{ ...data.message, pending: false }],
      ))
    } catch {
      setMessages((current) => current.map((message) => (
        message.id === localId ? { ...message, pending: false, failed: true } : message
      )))
    }
  }

  async function sendMessage() {
    const cleanText = text.trim()
    if (!cleanText || !allowed) return
    const localId = `local-${crypto.randomUUID()}`
    const messageName = name.trim() || "Anonymous Corgi"
    setMessages((current) => mergeMessages(current, [{
      id: localId,
      name: messageName,
      text: cleanText,
      ts: Date.now(),
      via: "geo",
      pending: true,
    }]))
    setText("")
    nearBottomRef.current = true
    await postMessage(localId, messageName, cleanText)
  }

  function retryMessage(message: Message) {
    setMessages((current) => current.map((entry) => (
      entry.id === message.id ? { ...entry, pending: true, failed: false } : entry
    )))
    void postMessage(message.id, message.name, message.text)
  }

  function dismissMessage(messageId: string) {
    setMessages((current) => current.filter((message) => message.id !== messageId))
  }

  function checkLocation() {
    setLocating(true)
    setRangeNote("")
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const coordinates = { lat: coords.latitude, lng: coords.longitude }
        sessionStorage.setItem("corgi-geo", JSON.stringify(coordinates))
        const inRange = await loadMessages(coordinates)
        if (inRange === false) setRangeNote("Hmm, you don't seem to be in range yet.")
        setLocating(false)
      },
      () => {
        setRangeNote("Hmm, you don't seem to be in range yet.")
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }


  function wrapSelection(before: string, after = before) {
    const composer = composerRef.current
    if (!composer) return
    const start = composer.selectionStart
    const end = composer.selectionEnd
    const selected = text.slice(start, end)
    const nextText = `${text.slice(0, start)}${before}${selected}${after}${text.slice(end)}`.slice(0, 500)
    setText(nextText)
    window.requestAnimationFrame(() => {
      composer.focus()
      const selectionStart = start + before.length
      composer.setSelectionRange(selectionStart, selectionStart + selected.length)
    })
  }

  const style = {
    "--corgi-bg": theme.background,
    "--corgi-surface": theme.surface,
    "--corgi-border": theme.border,
    "--corgi-text": theme.text,
    "--corgi-body": theme.body,
    "--corgi-muted": theme.muted,
    "--corgi-accent": theme.accent,
    "--corgi-accent-dark": theme.accentDark,
    fontFamily: "Geist, sans-serif",
  } as React.CSSProperties

  return (
    <main style={style} className="flex h-dvh min-h-dvh w-full flex-col overflow-hidden bg-[#f6f6f6] text-[#191919] selection:bg-[#ff5c00]/20">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');`}</style>
      <header className="relative z-30 shrink-0 border-b border-[#e1e1e1] bg-white px-4 py-3 sm:px-8">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <a href="/corgi" aria-label="Back to Corgi landing" className="grid size-9 shrink-0 place-items-center rounded-full border border-[#e1e1e1] text-[#7b7b7b] transition-colors hover:border-[#191919] hover:text-[#191919]">
              <ArrowLeft size={15} />
            </a>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-[#191919]">Corgi Chat</h1>
              <a href="https://www.google.com/maps/search/?api=1&query=9+Claude+Lane+San+Francisco" target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-[#7b7b7b] transition-colors hover:text-[#ff5c00]">9 Claude Lane</a>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5 sm:gap-4">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] text-[#7b7b7b] sm:text-xs">
              <span className={`size-1.5 rounded-full ${reconnecting ? "bg-amber-500" : "bg-emerald-600"}`} />
              Live · {viewerCount} in the room
            </span>
            <button type="button" onClick={() => setInfoOpen(true)} aria-label="About this guestbook" className="grid size-9 place-items-center rounded-full border border-[#e1e1e1] text-[#7b7b7b] transition-colors hover:border-[#191919] hover:text-[#191919]">
              <Info size={15} />
            </button>
          </div>
        </div>
      </header>

      <div
        ref={listRef}
        onScroll={(event) => { const target = event.currentTarget; nearBottomRef.current = target.scrollHeight - target.scrollTop - target.clientHeight < 100 }}
        className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#f6f6f6]"
      >
        {!loaded && messages.length === 0 ? (
          <div className="flex min-h-full items-center justify-center px-6 text-center text-sm text-[#7b7b7b]">Opening the guestbook…</div>
        ) : messages.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center px-6 py-16 text-center">
            <p style={{ fontFamily: "Instrument Serif, serif" }} className="text-4xl italic text-[#ff5c00] sm:text-5xl">The first page is yours.</p>
            <p className="mt-3 text-sm text-[#7b7b7b]">Notes last 24 hours, then the page turns.</p>
          </div>
        ) : (
          <div className="mx-auto my-6 w-full max-w-3xl px-3 py-2 sm:px-6">
            <div className="divide-y divide-[#ececec] overflow-hidden rounded-2xl border border-[#e1e1e1] bg-white">
              {messages.map((message) => (
                <article key={message.id} className={`min-w-0 px-5 py-5 sm:px-7 ${message.pending ? "opacity-60" : "opacity-100"}`}>
                  <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                    <h2 className="min-w-0 truncate text-[15px] font-semibold text-[#191919]">{message.name}</h2>
                    <span className="shrink-0 text-[#ff5c00]">{message.via === "wifi" ? <Wifi size={12} /> : <MapPin size={12} />}</span>
                    <span className="text-xs text-[#7b7b7b]">·</span>
                    {message.pending ? (
                      <span className="text-xs text-[#7b7b7b]">Sending…</span>
                    ) : message.failed ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs text-[#cc4a00]">Not sent</span>
                        <button type="button" onClick={() => retryMessage(message)} className="text-xs font-medium text-[#ff5c00] underline underline-offset-2 hover:text-[#cc4a00]">Retry</button>
                        <button type="button" onClick={() => dismissMessage(message.id)} aria-label="Dismiss failed message" className="grid size-5 place-items-center rounded text-[#7b7b7b] hover:bg-[#f1f1f1] hover:text-[#191919]"><X size={12} /></button>
                      </span>
                    ) : (
                      <time dateTime={new Date(message.ts).toISOString()} className="text-xs text-[#7b7b7b]">{relativeTime(message.ts)}</time>
                    )}
                  </div>
                  <div className="mt-2 min-w-0 break-words text-[15px] leading-7 text-[#4a4a4a]">{renderMessageText(message.text)}</div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>

      {allowed ? (
        <footer className="relative z-20 shrink-0 border-t border-[#e1e1e1] bg-white px-3 pb-[max(3rem,env(safe-area-inset-bottom))] pt-2.5 sm:px-8 sm:pb-4 sm:pt-3">
          <div className="mx-auto w-full max-w-3xl">
            <div className="mb-1.5 flex items-center gap-0.5" role="toolbar" aria-label="Message formatting">
              <button type="button" onClick={() => wrapSelection("**")} aria-label="Bold" title="Bold" className="grid size-8 place-items-center rounded-lg text-[#7b7b7b] hover:bg-[#f1f1f1] hover:text-[#191919]"><Bold size={13} /></button>
              <button type="button" onClick={() => wrapSelection("*")} aria-label="Italic" title="Italic" className="grid size-8 place-items-center rounded-lg text-[#7b7b7b] hover:bg-[#f1f1f1] hover:text-[#191919]"><Italic size={13} /></button>
              <button type="button" onClick={() => wrapSelection("`")} aria-label="Inline code" title="Inline code" className="grid size-8 place-items-center rounded-lg text-[#7b7b7b] hover:bg-[#f1f1f1] hover:text-[#191919]"><Code2 size={13} /></button>
              <button type="button" onClick={() => wrapSelection("[", "](https://)")} aria-label="Link" title="Link" className="grid size-8 place-items-center rounded-lg text-[#7b7b7b] hover:bg-[#f1f1f1] hover:text-[#191919]"><Link size={13} /></button>
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-[#7b7b7b]"><span className="size-1.5 rounded-full bg-emerald-600" />Posting live</span>
            </div>
            <div className="flex min-w-0 gap-2">
              <input value={name} onChange={(event) => saveName(event.target.value)} maxLength={30} placeholder="Your name" aria-label="Your name" className="h-11 w-[6.5rem] shrink-0 rounded-xl border border-[#e1e1e1] bg-white px-2.5 text-sm text-[#191919] outline-none placeholder:text-[#7b7b7b] focus:border-[#ff5c00] sm:w-36 sm:px-3" />
              <textarea ref={composerRef} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage() } }} maxLength={500} rows={1} placeholder="Leave a note…" aria-label="Message" className="h-11 min-w-0 flex-1 resize-none rounded-xl border border-[#e1e1e1] bg-white px-3 py-2.5 text-sm leading-5 text-[#191919] outline-none placeholder:text-[#7b7b7b] focus:border-[#ff5c00]" />
              <span className="shrink-0 rounded-xl bg-[#cc4a00] pb-1">
                <button type="button" onClick={() => void sendMessage()} disabled={!text.trim()} aria-label="Send message" className="grid size-11 place-items-center rounded-xl bg-[#ff5c00] text-white transition-transform active:translate-y-1 disabled:opacity-40"><Send size={17} /></button>
              </span>
            </div>
          </div>
        </footer>
      ) : (
        <footer className="relative z-20 shrink-0 border-t border-[#e1e1e1] bg-white px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-3 sm:px-8 sm:py-4">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="text-center sm:text-left">
              <p className="text-sm text-[#4a4a4a]">Watching from afar — come by 9 Claude Lane to join.</p>
              {rangeNote && <p className="mt-0.5 text-xs text-[#cc4a00]">{rangeNote}</p>}
            </div>
            <span className="shrink-0 rounded-xl bg-[#cc4a00] pb-1">
              <button type="button" onClick={checkLocation} disabled={locating} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#ff5c00] px-4 text-sm font-medium text-white transition-transform active:translate-y-1 disabled:opacity-40"><MapPin size={13} />{locating ? "Checking…" : "I’m at the cafe"}</button>
            </span>
          </div>
        </footer>
      )}

      {infoOpen && (
        <div className="absolute inset-0 z-50 flex items-start justify-end bg-[#191919]/10 p-3 pt-16 sm:p-6 sm:pt-20" role="presentation" onClick={() => setInfoOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="guestbook-info" onClick={(event) => event.stopPropagation()} className="w-full max-w-xs rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.10)]">
            <div className="flex items-start justify-between gap-4">
              <h2 id="guestbook-info" className="text-sm font-semibold text-[#191919]">About the room</h2>
              <button type="button" onClick={() => setInfoOpen(false)} aria-label="Close information" className="grid size-7 place-items-center rounded-full text-[#7b7b7b] hover:bg-[#f1f1f1] hover:text-[#191919]"><X size={14} /></button>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[#4a4a4a]">
              <p>{allowed ? "Posting is open from your current connection." : "Anyone can read. Posting unlocks when you’re at the cafe."}</p>
              <p>Notes remain in the guestbook for 24 hours.</p>
              {reconnecting && <p className="text-[#cc4a00]">The live connection is reconnecting.</p>}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
