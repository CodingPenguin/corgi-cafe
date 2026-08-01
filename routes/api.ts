import type { Context } from "hono"
import { createHash, randomUUID } from "node:crypto"
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"

const dataPath = "/home/workspace/Projects/corgi-cafe/data.json"
const SUPABASE_URL = "https://zjwuybogjgljeueurffg.supabase.co"
const DEFAULT_CAFE_LOCATION = { lat: 37.78995, lng: -122.40435, radiusM: 150 }
// TESTING ONLY: set to false before launch — lets anyone post from anywhere
const GATE_DISABLED = true

type CafeLocation = { lat: number; lng: number; radiusM: number }
type Message = {
  id: string
  name: string
  text: string
  ts: number
  via: "wifi" | "geo"
}
type Data = {
  adminHash: string | null
  networkIps: string[]
  cafeLocation: CafeLocation | null
}

type SupabaseMessage = {
  id: string
  name: string
  text: string
  created_at: string
  via: "wifi" | "geo"
}

const emptyData = (): Data => ({
  adminHash: null,
  networkIps: [],
  cafeLocation: null,
})

let writeChain: Promise<void> = Promise.resolve()
const lastPosts = new Map<string, number>()

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const result = writeChain.then(task, task)
  writeChain = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}

async function readData(): Promise<Data> {
  try {
    const stored = JSON.parse(await readFile(dataPath, "utf8")) as Data & { messages?: unknown }
    return {
      adminHash: stored.adminHash ?? null,
      networkIps: Array.isArray(stored.networkIps) ? stored.networkIps : [],
      cafeLocation: stored.cafeLocation ?? null,
    }
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") return emptyData()
    throw error
  }
}

async function writeData(data: Data): Promise<void> {
  await mkdir("/home/workspace/Projects/corgi-cafe", { recursive: true })
  const temporaryPath = `${dataPath}.${randomUUID()}.tmp`
  await writeFile(temporaryPath, JSON.stringify(data, null, 2), "utf8")
  await rename(temporaryPath, dataPath)
}

async function ensureDataFile(): Promise<void> {
  try {
    await readFile(dataPath, "utf8")
  } catch (error) {
    if ((error as { code?: string }).code !== "ENOENT") throw error
    await serialize(async () => {
      try {
        await readFile(dataPath, "utf8")
      } catch (latestError) {
        if ((latestError as { code?: string }).code !== "ENOENT") throw latestError
        await writeData(emptyData())
      }
    })
  }
}

function clientIp(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return c.req.header("x-real-ip")?.trim() || "unknown"
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

function presence(
  data: Data,
  ip: string,
  lat: number | null,
  lng: number | null,
): { allowed: boolean; via: "wifi" | "geo" | null } {
  if (GATE_DISABLED) return { allowed: true, via: "geo" }
  if (ip !== "unknown" && data.networkIps.includes(ip)) return { allowed: true, via: "wifi" }
  const location = data.cafeLocation ?? DEFAULT_CAFE_LOCATION
  if (
    lat !== null &&
    lng !== null &&
    distanceM(lat, lng, location.lat, location.lng) <= location.radiusM
  ) {
    return { allowed: true, via: "geo" }
  }
  return { allowed: false, via: null }
}

function hash(secret: string): string {
  return createHash("sha256").update(secret).digest("hex")
}

function serviceRoleKey(): string | null {
  return process.env.SUPABASE_CORGI_SERVICE_ROLE_KEY?.trim() || null
}

function supabaseHeaders(key: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra,
  }
}

async function fetchMessages(key: string): Promise<Message[]> {
  const query = new URLSearchParams({
    select: "id,name,text,created_at,via",
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
    }),
  })
  if (!response.ok) throw new Error("supabase-insert-failed")
}

async function deleteMessages(key: string, filter: string): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/corgi_messages?${filter}`, {
    method: "DELETE",
    headers: supabaseHeaders(key),
  })
  if (!response.ok) throw new Error("supabase-delete-failed")
}

async function broadcastClear(key: string): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: supabaseHeaders(key, { "Content-Type": "application/json" }),
    body: JSON.stringify({ messages: [{ topic: "corgi-room", event: "clear", payload: {}, private: false }] }),
  })
  if (!response.ok) throw new Error("supabase-broadcast-failed")
}

async function jsonBody(c: Context): Promise<Record<string, unknown> | null> {
  try {
    const body = await c.req.json()
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

export default async function (c: Context): Promise<Response> {
  const action = c.req.param("action")
  const method = c.req.method.toUpperCase()

  if (!(["messages", "config", "admin"] as string[]).includes(action)) {
    return c.json({ error: "not-found" }, 404)
  }

  await ensureDataFile()

  if (action === "messages" && method === "GET") {
    const key = serviceRoleKey()
    if (!key) return c.json({ error: "message-service-unavailable" }, 503)
    const data = await readData()
    const lat = numeric(c.req.query("lat"))
    const lng = numeric(c.req.query("lng"))
    try {
      return c.json({
        messages: await fetchMessages(key),
        presence: presence(data, clientIp(c), lat, lng),
        configured: true,
      })
    } catch {
      return c.json({ error: "messages-unavailable" }, 503)
    }
  }

  if (action === "messages" && method === "POST") {
    const body = await jsonBody(c)
    if (!body) return c.json({ error: "invalid-body" }, 400)

    const data = await readData()
    const ip = clientIp(c)
    const currentPresence = presence(data, ip, numeric(body.lat), numeric(body.lng))
    if (!currentPresence.allowed || !currentPresence.via) {
      return c.json({ error: "not-at-cafe" }, 403)
    }

    const text = typeof body.text === "string" ? body.text.trim() : ""
    const suppliedName = typeof body.name === "string" ? body.name.trim() : ""
    const name = suppliedName || "Anonymous Corgi"
    if (!text || text.length > 500 || name.length > 30) {
      return c.json({ error: "invalid-message" }, 400)
    }

    const now = Date.now()
    if (now - (lastPosts.get(ip) ?? 0) < 2000) {
      return c.json({ error: "too-fast" }, 429)
    }
    lastPosts.set(ip, now)

    const message: Message = {
      id: randomUUID(),
      name,
      text,
      ts: now,
      via: currentPresence.via,
    }
    const key = serviceRoleKey()
    if (!key) {
      if (lastPosts.get(ip) === now) lastPosts.delete(ip)
      return c.json({ error: "message-service-unavailable" }, 503)
    }
    try {
      await insertMessage(key, message)
    } catch {
      if (lastPosts.get(ip) === now) lastPosts.delete(ip)
      return c.json({ error: "message-store-unavailable" }, 503)
    }
    const cutoff = new URLSearchParams({ created_at: `lt.${new Date(now - 86_400_000).toISOString()}` })
    void deleteMessages(key, cutoff.toString()).catch(() => undefined)
    return c.json({ ok: true, message })
  }

  if (action === "config" && method === "GET") {
    const data = await readData()
    const envSecret = Boolean(process.env.CORGI_ADMIN_SECRET)
    const location = data.cafeLocation ?? DEFAULT_CAFE_LOCATION
    return c.json({
      claimed: envSecret || data.adminHash !== null,
      networkCount: data.networkIps.length,
      location: { ...location, isDefault: data.cafeLocation === null },
      envSecret,
    })
  }

  if (action === "admin" && method === "POST") {
    const body = await jsonBody(c)
    if (!body) return c.json({ error: "invalid-body" }, 400)

    const secret = typeof body.secret === "string" ? body.secret : ""
    const op = typeof body.op === "string" ? body.op : ""
    const allowedOps = ["register_ip", "forget_ips", "set_location", "clear_location", "clear_chat"]
    if (!allowedOps.includes(op)) return c.json({ error: "invalid-op" }, 400)

    const lat = numeric(body.lat)
    const lng = numeric(body.lng)
    if (op === "set_location" && (lat === null || lng === null)) {
      return c.json({ error: "invalid-location" }, 400)
    }

    const result = await serialize(async () => {
      const data = await readData()
      const envSecret = process.env.CORGI_ADMIN_SECRET
      if (envSecret ? secret !== envSecret : data.adminHash ? hash(secret) !== data.adminHash : secret.length < 6) {
        return { status: 401 as const, body: { error: "bad-secret" } }
      }
      if (!envSecret && data.adminHash === null) data.adminHash = hash(secret)

      if (op === "clear_chat") {
        const key = serviceRoleKey()
        if (!key) return { status: 503 as const, body: { error: "message-service-unavailable" } }
        try {
          await deleteMessages(key, "id=not.is.null")
        } catch {
          return { status: 503 as const, body: { error: "clear-chat-unavailable" } }
        }
        await writeData(data)
        void broadcastClear(key).catch(() => undefined)
        return { status: 200 as const, body: { ok: true } }
      }

      if (op === "register_ip") {
        const ip = clientIp(c)
        if (!data.networkIps.includes(ip)) data.networkIps.push(ip)
        await writeData(data)
        return { status: 200 as const, body: { ok: true, ip } }
      }
      if (op === "forget_ips") data.networkIps = []
      if (op === "set_location") {
        const requestedRadius = numeric(body.radiusM) ?? 150
        data.cafeLocation = {
          lat: lat as number,
          lng: lng as number,
          radiusM: Math.min(1000, Math.max(20, requestedRadius)),
        }
      }
      if (op === "clear_location") data.cafeLocation = null
      await writeData(data)
      return { status: 200 as const, body: { ok: true } }
    })
    return c.json(result.body, result.status)
  }

  return c.json({ error: "method-not-allowed" }, 405)
}
