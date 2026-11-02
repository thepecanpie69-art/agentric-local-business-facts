# Listing copy (approved for free registry submissions)
**Local Business Facts API — any country, any language.** Send a business's website URL; get back JSON facts: name, phone (raw + E.164), postal address, opening hours, socials, open/closed signal, country, page language. Every field carries its source URL, extraction method and a confidence score. Reads schema.org, microdata, tel: links and localized contact/legal pages (Kontakt, Contacto, Impressum, Mentions légales…).

- Price: **$10 per 500 lookups** (prepaid, card, worldwide): https://buy.stripe.com/14A4gz0CEgg800Cdki0x200 — key shown right after checkout.
- You are only charged for successful lookups (at least a name or contact field found). Bot-blocked or failed sites are free.
- Honest accuracy note: coverage is partial. It only knows what the business publishes on its own site; some fields will be missing. Check the per-field source URL and confidence.
- Business information only, no personal data.
- API: https://agentric-facts.agentric.workers.dev/v1/lookup?url=… (header x-api-key)
- MCP (streamable HTTP): https://agentric-facts.agentric.workers.dev/mcp — tool `lookup_business {url, country?}`
- OpenAPI: https://agentric-facts.agentric.workers.dev/openapi.json · llms.txt: https://agentric-facts.agentric.workers.dev/llms.txt
- Source: https://github.com/thepecanpie69-art/agentric-local-business-facts (MIT)
Tags: local-business, enrichment, international, multilingual, e164, mcp
