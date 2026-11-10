export async function onRequest(context: { request: Request }): Promise<Response> {
  const url = new URL(context.request.url);
  const targetUrl = `https://gato-sq4j.onrender.com${url.pathname}${url.search}`;

  const cleanHeaders = new Headers();
  for (const [key, value] of context.request.headers.entries()) {
    const k = key.toLowerCase();
    // Não encaminha headers restritos ou específicos do edge da Cloudflare
    if (k !== "host" && !k.startsWith("cf-")) {
      cleanHeaders.set(key, value);
    }
  }
  cleanHeaders.set("X-Forwarded-Host", url.host);

  return fetch(targetUrl, {
    method: context.request.method,
    headers: cleanHeaders,
    body: context.request.method !== "GET" && context.request.method !== "HEAD"
      ? context.request.body
      : undefined,
  });
}
