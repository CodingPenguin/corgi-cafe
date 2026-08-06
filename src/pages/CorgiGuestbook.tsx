import React, { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, Crown, Info, Send, Timer, X } from "lucide-react"
import { createClient } from "@supabase/supabase-js"

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
  senderId: string | null
  isCreator: boolean
  pending?: boolean
  failed?: boolean
}

type SupabaseMessage = {
  id: string
  name: string
  text: string
  created_at: string
  via: "wifi" | "geo"
  sender_id: string | null
  is_creator: boolean
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

function browserId(): string {
  const existing = localStorage.getItem("corgi-browser-id")
  if (existing) return existing
  const created = crypto.randomUUID()
  localStorage.setItem("corgi-browser-id", created)
  return created
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

function linkifyMessageText(text: string, keyPrefix: string, mine = false): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  const combinedPattern = new RegExp(`\\[([^\\]\\n]+)\\]\\((https?:\\/\\/[^\\s<>"]+)\\)|${URL_PATTERN.source}`, "gi")
  for (const match of text.matchAll(combinedPattern)) {
    const start = match.index ?? 0
    if (start > lastIndex) nodes.push(text.slice(lastIndex, start))
    if (match[1] && match[2]) {
      nodes.push(
        <a key={`${keyPrefix}-${start}-markdown`} href={match[2]} target="_blank" rel="noopener noreferrer nofollow" className={mine ? "break-words font-medium text-white underline decoration-white/60 underline-offset-2 hover:decoration-white" : "break-words font-medium text-[#ff5c00] underline decoration-1 underline-offset-2 hover:text-[#cc4a00]"}>
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
      <a key={`${keyPrefix}-${start}-${trimmed}`} href={href} target="_blank" rel="noopener noreferrer nofollow" className={mine ? "break-all font-medium text-white underline decoration-white/60 underline-offset-2 hover:decoration-white" : "break-all font-medium text-[#ff5c00] underline decoration-1 underline-offset-2 hover:text-[#cc4a00]"}>
        {trimmed}
      </a>,
    )
    lastIndex = start + raw.length
    if (trimmed.length < raw.length) nodes.push(raw.slice(trimmed.length))
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return nodes
}

function renderInlineMessageText(text: string, mine = false): React.ReactNode[] {
  return tokenizeMessageText(text).map((token, index) => {
    const key = `${token.type}-${index}`
    if (token.type === "code") return <code key={key} className={mine ? "rounded bg-white/20 px-1.5 py-0.5 font-mono text-[0.9em] text-white" : "rounded bg-[#f1f1f1] px-1.5 py-0.5 font-mono text-[0.9em] text-[#191919]"}>{token.text}</code>
    const content = linkifyMessageText(token.text, key, mine)
    if (token.type === "bold") return <strong key={key} className={mine ? "font-bold text-white" : "font-bold text-[#191919]"}>{content}</strong>
    if (token.type === "italic") return <em key={key} className="italic">{content}</em>
    if (token.type === "strike") return <s key={key} className="line-through opacity-70">{content}</s>
    return <React.Fragment key={key}>{content}</React.Fragment>
  })
}

function renderMessageText(text: string, mine = false): React.ReactNode {
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
      blocks.push(<ul key={`list-${index}`} className="my-1.5 list-disc space-y-1 pl-5">{items.map((item, itemIndex) => <li key={itemIndex}>{renderInlineMessageText(item, mine)}</li>)}</ul>)
      continue
    }

    if (line.startsWith("> ")) {
      blocks.push(<blockquote key={`quote-${index}`} className={mine ? "my-2 border-l-4 border-white/50 pl-3 italic text-white/80" : "my-2 border-l-4 border-[#ff5c00] pl-3 italic text-[#7b7b7b]"}>{renderInlineMessageText(line.slice(2), mine)}</blockquote>)
    } else if (line === "") {
      blocks.push(<span key={`break-${index}`} className="block h-2" />)
    } else {
      blocks.push(<span key={`line-${index}`} className="block">{renderInlineMessageText(line, mine)}</span>)
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

function formatElapsedTime(elapsed: number): string {
  const totalSeconds = Math.floor(elapsed / 1_000)
  const seconds = String(totalSeconds % 60).padStart(2, "0")
  const totalMinutes = Math.floor(totalSeconds / 60)
  if (totalMinutes < 60) return `${totalMinutes}:${seconds}`
  const minutes = String(totalMinutes % 60).padStart(2, "0")
  return `${Math.floor(totalMinutes / 60)}:${minutes}:${seconds}`
}

export default function CorgiGuestbook() {
  const [messages, setMessages] = useState<Message[]>([])
  const [allowed, setAllowed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [name, setName] = useState("")
  const [text, setText] = useState("")
  const [viewerCount, setViewerCount] = useState(0)
  const [infoOpen, setInfoOpen] = useState(false)
  const [checkinTimestamp, setCheckinTimestamp] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const nearBottomRef = useRef(true)
  const mineRef = useRef(new Set<string>())

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
      if (response.status === 403) {
        sessionStorage.removeItem("corgi-geo")
        window.location.replace("/")
        return false
      }
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
    const savedName = localStorage.getItem("corgi-name") || ""
    if (!savedName.trim()) {
      window.location.replace("/")
      return
    }
    setName(savedName)
    let supabase: ReturnType<typeof createClient> | null = null
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null
    let cancelled = false

    void loadMessages().then((inRange) => {
      if (!inRange || cancelled) return
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      channel = supabase.channel("corgi-room", {
        config: { presence: { key: browserId() } },
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
              senderId: row.sender_id,
              isCreator: row.is_creator,
            }]))
          },
        )
        .on("presence", { event: "sync" }, () => {
          setViewerCount(Object.keys(channel?.presenceState() ?? {}).length)
        })
        .on("broadcast", { event: "clear" }, () => setMessages([]))
        .subscribe(async (status) => {
          const connected = status === "SUBSCRIBED"
          setReconnecting(!connected)
          if (connected) await channel?.track({ online_at: new Date().toISOString() })
        })
    })

    return () => {
      cancelled = true
      if (supabase && channel) void supabase.removeChannel(channel)
    }
  }, [loadMessages])

  useEffect(() => {
    if (nearBottomRef.current) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
    }
  }, [messages])

  useEffect(() => {
    if (!allowed) {
      setCheckinTimestamp(null)
      setElapsedTime(0)
      return
    }

    const storedValue = sessionStorage.getItem("corgi-checkin-ts")
    let timestamp = storedValue === null || storedValue.trim() === "" ? Number.NaN : Number(storedValue)
    if (!Number.isFinite(timestamp)) {
      timestamp = Date.now()
      sessionStorage.setItem("corgi-checkin-ts", String(timestamp))
    }
    setCheckinTimestamp(timestamp)

    const updateElapsedTime = () => setElapsedTime(Math.max(0, Date.now() - timestamp))
    updateElapsedTime()
    const interval = window.setInterval(updateElapsedTime, 1_000)
    return () => window.clearInterval(interval)
  }, [allowed])

  async function postMessage(localId: string, messageName: string, messageText: string) {
    try {
      const coordinates = storedCoordinates()
      const response = await fetch("/api/corgi/messages", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ name: messageName, text: messageText, senderId: browserId(), ...coordinates }),
      })
      if (!response.ok) throw new Error("send failed")
      const data = (await response.json()) as SendResponse
      mineRef.current.add(data.message.id)
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
    mineRef.current.add(localId)
    setMessages((current) => mergeMessages(current, [{
      id: localId,
      name: messageName,
      text: cleanText,
      ts: Date.now(),
      via: "geo",
      senderId: browserId(),
      isCreator: false,
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
      <header className="relative z-30 shrink-0 border-b-2 border-[#191919] bg-[#ff5c00] px-3 py-2.5 sm:px-6 sm:py-3">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <a href="/" aria-label="Back to Corgi landing" className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-[#191919] bg-white text-[#191919] shadow-[0_3px_0_#191919] transition-transform hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none">
              <ArrowLeft size={15} />
            </a>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold leading-none tracking-[-0.04em] text-white sm:text-2xl">Corgi Chat</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {allowed && checkinTimestamp !== null ? (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-[#191919] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#191919] shadow-[0_3px_0_#191919] sm:px-3 sm:text-xs">
                <Timer size={13} color="#ff5c00" />
                <span><span className="hidden sm:inline">Locked in · </span>{formatElapsedTime(elapsedTime)}</span>
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-[#191919] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#191919] shadow-[0_3px_0_#191919] sm:px-3 sm:text-xs">
              <span className={`size-1.5 rounded-full ${reconnecting ? "bg-amber-500" : "bg-emerald-600"}`} />
              <span className="hidden sm:inline">Live · </span>{viewerCount}<span className="hidden sm:inline"> in the room</span>
            </span>
            <button type="button" onClick={() => setInfoOpen(true)} aria-label="About this chatroom" className="grid size-9 place-items-center rounded-full border-2 border-[#191919] bg-white text-[#191919] shadow-[0_3px_0_#191919] transition-transform hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none">
              <Info size={15} />
            </button>
          </div>
        </div>
      </header>

      <div
        ref={listRef}
        onScroll={(event) => { const target = event.currentTarget; nearBottomRef.current = target.scrollHeight - target.scrollTop - target.clientHeight < 100 }}
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.65), rgba(255,255,255,0.65)), url('/images/corgi-doodle.webp')", backgroundPosition: "center", backgroundSize: "cover" }}
        className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
      >
        {!loaded && messages.length === 0 ? (
          <div className="flex min-h-full items-center justify-center px-6 text-center text-sm text-[#7b7b7b]">Opening the chatroom…</div>
        ) : messages.length === 0 ? (
          <div className="min-h-full bg-[#f6f6f6]/45">
            <div className={`mx-auto flex w-full max-w-4xl px-3 pt-10 sm:px-8 sm:pt-14 ${allowed ? "pb-44 sm:pb-40" : "pb-32 sm:pb-28"}`}>
              <section className="w-full max-w-xl rounded-[24px] rounded-bl-md border-2 border-[#191919] bg-white px-6 py-6 shadow-[0_10px_0_#191919,0_20px_40px_rgba(25,25,25,0.18)] sm:px-8 sm:py-8">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#ff5c00]">Corgi Chat</p>
                <h2 style={{ fontFamily: "Instrument Serif, serif" }} className="mt-4 text-[42px] leading-[0.95] tracking-[-0.03em] text-[#191919] sm:text-5xl">Quiet in here.</h2>
                <p className="mt-4 text-base font-medium leading-6 text-[#4a4a4a] sm:text-lg">Be the first to say hi.</p>
                <p className="mt-7 border-t-2 border-[#191919]/10 pt-4 text-xs text-[#7b7b7b]">Messages disappear after 24 hours.</p>
              </section>
            </div>
          </div>
        ) : (
          <div className={`mx-auto flex w-full max-w-4xl flex-col gap-4 px-3 py-6 sm:gap-5 sm:px-8 sm:py-10 ${allowed ? "pb-44 sm:pb-40" : "pb-32 sm:pb-28"}`}>
            {messages.map((message) => {
              const mine = message.senderId === browserId() || mineRef.current.has(message.id)
              return (
                <article key={message.id} className={`min-w-48 w-fit max-w-[92%] px-5 py-4 sm:min-w-64 sm:max-w-[78%] sm:px-6 sm:py-5 ${mine ? "self-end rounded-[24px] rounded-br-md border-2 border-[#191919] bg-[#ff5c00] text-white shadow-[0_9px_0_#191919,0_16px_30px_rgba(25,25,25,0.18)]" : "self-start rounded-[24px] rounded-bl-md border-2 border-[#191919] bg-white shadow-[0_9px_0_#191919,0_16px_30px_rgba(25,25,25,0.14)]"} ${message.pending ? "opacity-60" : "opacity-100"}`}>
                  <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                    <h2 className={`min-w-0 truncate text-[13px] font-semibold ${mine ? "text-white" : "text-[#191919]"}`}>{message.name}</h2>
                    {message.isCreator ? (
                      <span
                        tabIndex={0}
                        aria-label="Creator"
                        className={`group relative inline-flex shrink-0 cursor-help items-center outline-none ${mine ? "text-white" : "text-[#ff5c00]"}`}
                      >
                        <Crown size={13} strokeWidth={2.4} aria-hidden="true" />
                        <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 rounded-md bg-[#191919] px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100">Creator</span>
                      </span>
                    ) : null}
                    <span className={`text-[11px] ${mine ? "text-white/70" : "text-[#7b7b7b]"}`}>·</span>
                    {message.pending ? (
                      <span className={`text-[11px] ${mine ? "text-white/70" : "text-[#7b7b7b]"}`}>Sending…</span>
                    ) : message.failed ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-[11px] text-white">Not sent</span>
                        <button type="button" onClick={() => retryMessage(message)} className="text-[11px] font-medium text-white underline underline-offset-2">Retry</button>
                        <button type="button" onClick={() => dismissMessage(message.id)} aria-label="Dismiss failed message" className="grid size-5 place-items-center rounded text-white hover:bg-white/20"><X size={12} /></button>
                      </span>
                    ) : (
                      <time dateTime={new Date(message.ts).toISOString()} className={`text-[11px] ${mine ? "text-white/70" : "text-[#7b7b7b]"}`}>{relativeTime(message.ts)}</time>
                    )}
                  </div>
                  <div className={`mt-2.5 min-w-0 break-words text-[16px] leading-7 ${mine ? "text-white" : "text-[#333333]"}`}>{renderMessageText(message.text, mine)}</div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {allowed ? (
        <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-6">
          <div className="pointer-events-auto mx-auto flex w-full max-w-3xl min-w-0 items-center gap-2 rounded-[22px] border-2 border-[#191919] bg-white py-2.5 pl-5 pr-2.5 shadow-[0_8px_0_#191919,0_18px_50px_rgba(25,25,25,0.22)] transition-colors focus-within:border-[#ff5c00] sm:py-3 sm:pl-6 sm:pr-3">
            <textarea value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage() } }} maxLength={500} rows={1} placeholder="Send a message…" aria-label="Message" className="h-11 min-w-0 flex-1 resize-none border-0 bg-transparent py-2.5 text-base leading-5 text-[#191919] outline-none placeholder:text-[#7b7b7b]" />
            <span className="shrink-0 rounded-xl bg-[#cc4a00] pb-1">
              <button type="button" onClick={() => void sendMessage()} disabled={!text.trim()} aria-label="Send message" className="grid size-11 place-items-center rounded-xl bg-[#ff5c00] text-white transition-transform active:translate-y-1 disabled:opacity-40"><Send size={17} /></button>
            </span>
          </div>
        </footer>
      ) : null}

      {infoOpen && (
        <div className="absolute inset-0 z-50 flex items-start justify-end bg-[#191919]/10 p-3 pt-16 sm:p-6 sm:pt-20" role="presentation" onClick={() => setInfoOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="chatroom-info" onClick={(event) => event.stopPropagation()} className="w-full max-w-xs rounded-2xl border border-[#e1e1e1] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.10)]">
            <div className="flex items-start justify-between gap-4">
              <h2 id="chatroom-info" className="text-sm font-semibold text-[#191919]">About the chatroom</h2>
              <button type="button" onClick={() => setInfoOpen(false)} aria-label="Close information" className="grid size-7 place-items-center rounded-full text-[#7b7b7b] hover:bg-[#f1f1f1] hover:text-[#191919]"><X size={14} /></button>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[#4a4a4a]">
              <p>You’re inside the Corgi Cafe chatroom.</p>
              <p>Messages remain in the chatroom for 24 hours.</p>
              {reconnecting && <p className="text-[#cc4a00]">The live connection is reconnecting.</p>}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
