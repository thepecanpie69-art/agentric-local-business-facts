# Agentric — Local Business Facts API

Worldwide, any language. Send a business website URL and get source-cited JSON facts: name, phone (raw + E.164), postal address, opening hours, socials, open/closed signal, country, page language. Each field has its source URL, extraction method and confidence. Business information only, no personal data.

- **Live API:** `GET https://agentric-facts.agentric.workers.dev/v1/lookup?url=<site>&country=<ISO2 optional>` with header `x-api-key: <key>` (or `Authorization: Bearer <key>`)
- **MCP (streamable HTTP):** `https://agentric-facts.agentric.workers.dev/mcp` — tool `lookup_business {url, country?}`
- **OpenAPI:** https://agentric-facts.agentric.workers.dev/openapi.json · **llms.txt:** https://agentric-facts.agentric.workers.dev/llms.txt
- **Price:** $10 per 500 lookups, prepaid by card from any country: https://buy.stripe.com/14A4gz0CEgg800Cdki0x200 (your key appears right after checkout). Check balance at `/balance`.
- Only successful lookups (name or a contact field found) use a credit. Without a key you get HTTP 402 with purchase info.

**Accuracy:** coverage is partial. It only reports what the business publishes on its own site (schema.org, microdata, tel: links, contact/Impressum pages), so some fields will be missing. Use the per-field source URL and confidence.

```bash
curl "https://agentric-facts.agentric.workers.dev/v1/lookup?url=https://www.sacher.com&country=AT" -H "x-api-key: YOUR_KEY"
```

MCP client config:
```json
{"mcpServers":{"local-business-facts":{"url":"https://agentric-facts.agentric.workers.dev/mcp","headers":{"x-api-key":"YOUR_KEY"}}}}
```

## Source
`worker.mjs` is the whole service (Cloudflare Worker + KV). `node test_unit.mjs` runs the unit tests. MIT licensed.
