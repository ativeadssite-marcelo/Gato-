const TARGET_URL = "https://gato-sq4j.onrender.com/api/health";

async function pingBackend(): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(TARGET_URL, {
    method: "GET",
    headers: { "User-Agent": "GATO-Cloudflare-KeepAlive/1.0" },
  });
  return { ok: res.ok, status: res.status };
}

export default {
  async scheduled(
    _event: unknown,
    _env: unknown,
    ctx: { waitUntil(promise: Promise<unknown>): void }
  ): Promise<void> {
    ctx.waitUntil(
      pingBackend().catch((err) => {
        console.error("[KeepAlive] Falha no ping agendado:", err);
      })
    );
  },

  async fetch(): Promise<Response> {
    const result = await pingBackend();
    return new Response(
      JSON.stringify({
        service: "gato-keepalive",
        target: TARGET_URL,
        ...result,
        timestamp: new Date().toISOString(),
      }),
      {
        status: result.ok ? 200 : 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  },
};

