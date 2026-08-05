import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"

type VercelRequest = {
  method?: string
  headers: Record<string, string | string[] | undefined>
  query: Record<string, string | string[] | undefined>
  body?: unknown
}

type VercelResponse = {
  setHeader(name: string, value: string): void
  status(code: number): VercelResponse
  json(body: unknown): VercelResponse
}

const SUPABASE_URL = "https://zjwuybogjgljeueurffg.supabase.co"
const DEFAULT_CAFE_LOCATION = { lat: 37.78995, lng: -122.40435, radiusM: 150 }
const GATE_DISABLED = false

type Message = {
  id: string
  name: string
  text: string
  ts: number
  via: "wifi" | "geo"
  senderId: string | null
  isCreator: boolean
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

const lastPosts = new Map<string, number>()

function clientIp(request: VercelRequest): string {
  const forwarded = request.headers["x-forwarded-for"]
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim()
  if (Array.isArray(forwarded)) return forwarded[0]?.trim() || "unknown"
  const real = request.headers["x-real-ip"]
  return typeof real === "string" ? real.trim() : "unknown"
}

function numeric(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180
  const latitudeDistance = radians(lat2 - lat1)
  const longitudeDistance = radians(lng2 - lng1)
  const a =
    Math.sin(latitudeDistance / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(longitudeDistance / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function presence(lat: number | null, lng: number | null) {
  if (GATE_DISABLED) return { allowed: true, via: "geo" as const }
  if (
    lat !== null &&
    lng !== null &&
    distanceM(lat, lng, DEFAULT_CAFE_LOCATION.lat, DEFAULT_CAFE_LOCATION.lng) <= DEFAULT_CAFE_LOCATION.radiusM
  ) {
    return { allowed: true, via: "geo" as const }
  }
  return { allowed: false, via: null }
}

function serviceRoleKey(): string | null {
  return process.env.SUPABASE_CORGI_SERVICE_ROLE_KEY?.trim() || null
}

function creatorClaimSecret(): string | null {
  return process.env.CORGI_CREATOR_CLAIM_SECRET?.trim() || null
}

function creatorCookieSecret(): string | null {
  return process.env.CORGI_CREATOR_COOKIE_SECRET?.trim() || null
}

function firstHeader(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || ""
  return value || ""
}

function secureEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function signCreatorCookie(secret: string): string {
  const payload = Buffer.from(JSON.stringify({
    role: "creator",
    exp: Date.now() + 365 * 24 * 60 * 60 * 1000,
    nonce: randomUUID(),
  })).toString("base64url")
  const signature = createHmac("sha256", secret).update(payload).digest("base64url")
  return `${payload}.${signature}`
}

function isCreatorRequest(request: VercelRequest): boolean {
  const secret = creatorCookieSecret()
  if (!secret) return false
  const cookies = firstHeader(request.headers.cookie).split(";")
  const value = cookies
    .map((cookie) => cookie.trim().split("="))
    .find(([name]) => name === "corgi_creator")
    ?.slice(1)
    .join("=")
  if (!value) return false
  const [payload, signature, ...extra] = value.split(".")
  if (!payload || !signature || extra.length) return false
  const expected = createHmac("sha256", secret).update(payload).digest("base64url")
  if (!secureEqual(signature, expected)) return false
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { role?: unknown; exp?: unknown }
    return parsed.role === "creator" && typeof parsed.exp === "number" && parsed.exp > Date.now()
  } catch {
    return false
  }
}

function supabaseHeaders(key: string, extra: Record<string, string> = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra }
}

async function fetchMessages(key: string): Promise<Message[]> {
  const query = new URLSearchParams({
    select: "id,name,text,created_at,via,sender_id,is_creator",
    created_at: `gte.${new Date(Date.now() - 86_400_000).toISOString()}`,
    order: "created_at.desc",
    limit: "100",
  })
  const response = await fetch(`${SUPABASE_URL}/rest/v1/corgi_messages?${query}`, {
    headers: supabaseHeaders(key),
  })
  if (!response.ok) throw new Error("supabase-read-failed")
  const rows = (await response.json()) as SupabaseMessage[]
  return rows.reverse().map((row) => ({
    id: row.id,
    name: row.name,
    text: row.text,
    ts: new Date(row.created_at).getTime(),
    via: row.via,
    senderId: row.sender_id,
    isCreator: row.is_creator,
  }))
}

async function insertMessage(key: string, message: Message): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/corgi_messages`, {
    method: "POST",
    headers: supabaseHeaders(key, { "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({
      id: message.id,
      name: message.name,
      text: message.text,
      created_at: new Date(message.ts).toISOString(),
      via: message.via,
      sender_id: message.senderId,
      is_creator: message.isCreator,
    }),
  })
  if (!response.ok) throw new Error("supabase-insert-failed")
}

async function deleteExpiredMessages(key: string): Promise<void> {
  const query = new URLSearchParams({
    created_at: `lt.${new Date(Date.now() - 86_400_000).toISOString()}`,
  })
  await fetch(`${SUPABASE_URL}/rest/v1/corgi_messages?${query}`, {
    method: "DELETE",
    headers: supabaseHeaders(key),
  })
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader("Cache-Control", "no-store")
  const action = Array.isArray(request.query.action) ? request.query.action[0] : request.query.action

  if (action === "claim" && request.method === "GET") {
    response.setHeader("Referrer-Policy", "no-referrer")
    const suppliedToken = Array.isArray(request.query.token) ? request.query.token[0] : request.query.token
    const claimSecret = creatorClaimSecret()
    const cookieSecret = creatorCookieSecret()
    if (!claimSecret || !cookieSecret || typeof suppliedToken !== "string" || !secureEqual(suppliedToken, claimSecret)) {
      return response.status(404).json({ error: "not-found" })
    }
    response.setHeader(
      "Set-Cookie",
      `corgi_creator=${signCreatorCookie(cookieSecret)}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Strict`,
    )
    response.setHeader("Location", "/chat")
    return response.status(302).json({ ok: true })
  }

  if (action === "presence" && request.method === "GET") {
    return response.status(200).json({
      presence: presence(numeric(request.query.lat), numeric(request.query.lng)),
    })
  }

  if (action === "messages" && request.method === "GET") {
    const currentPresence = presence(numeric(request.query.lat), numeric(request.query.lng))
    if (!currentPresence.allowed) {
      return response.status(403).json({ error: "not-at-cafe" })
    }
    const key = serviceRoleKey()
    if (!key) return response.status(503).json({ error: "message-service-unavailable" })
    try {
      return response.status(200).json({
        messages: await fetchMessages(key),
        presence: currentPresence,
        configured: true,
      })
    } catch {
      return response.status(503).json({ error: "messages-unavailable" })
    }
  }

  if (action === "messages" && request.method === "POST") {
    const body = request.body && typeof request.body === "object"
      ? request.body as Record<string, unknown>
      : null
    if (!body) return response.status(400).json({ error: "invalid-body" })
    const currentPresence = presence(numeric(body.lat), numeric(body.lng))
    if (!currentPresence.allowed || !currentPresence.via) {
      return response.status(403).json({ error: "not-at-cafe" })
    }
    const text = typeof body.text === "string" ? body.text.trim() : ""
    const suppliedName = typeof body.name === "string" ? body.name.trim() : ""
    const name = suppliedName || "Anonymous Corgi"
    const suppliedSenderId = typeof body.senderId === "string" ? body.senderId.trim() : ""
    const senderId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(suppliedSenderId)
      ? suppliedSenderId
      : null
    if (!text || text.length > 500 || name.length > 30) {
      return response.status(400).json({ error: "invalid-message" })
    }
    const ip = clientIp(request)
    const now = Date.now()
    if (now - (lastPosts.get(ip) ?? 0) < 2000) {
      return response.status(429).json({ error: "too-fast" })
    }
    lastPosts.set(ip, now)
    const message: Message = {
      id: randomUUID(),
      name,
      text,
      ts: now,
      via: currentPresence.via,
      senderId,
      isCreator: isCreatorRequest(request),
    }
    const key = serviceRoleKey()
    if (!key) return response.status(503).json({ error: "message-service-unavailable" })
    try {
      await insertMessage(key, message)
      void deleteExpiredMessages(key)
      return response.status(200).json({ ok: true, message })
    } catch {
      if (lastPosts.get(ip) === now) lastPosts.delete(ip)
      return response.status(503).json({ error: "message-store-unavailable" })
    }
  }

  if (action === "config" && request.method === "GET") {
    return response.status(200).json({
      claimed: Boolean(process.env.CORGI_ADMIN_SECRET),
      networkCount: 0,
      location: { ...DEFAULT_CAFE_LOCATION, isDefault: true },
      envSecret: Boolean(process.env.CORGI_ADMIN_SECRET),
    })
  }

  return response.status(request.method === "GET" || request.method === "POST" ? 404 : 405).json({
    error: request.method === "GET" || request.method === "POST" ? "not-found" : "method-not-allowed",
  })
}
