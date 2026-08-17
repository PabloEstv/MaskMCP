# MaskMCP

[![npm](https://img.shields.io/npm/v/@pablo_estv/maskmcp.svg)](https://www.npmjs.com/package/@pablo_estv/maskmcp)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)
[![MCP ready](https://img.shields.io/badge/MCP-ready-purple.svg)](https://modelcontextprotocol.io)

**Confidential egress proxy** for AI agents. Secrets stay on your machine. The model never reads them: it asks MaskMCP to call an allowlisted HTTPS endpoint, and the vault injects the credential in-process.

Package: [`@pablo_estv/maskmcp`](https://www.npmjs.com/package/@pablo_estv/maskmcp)

## Security guarantees

- **AES-256-GCM** authenticated encryption per secret; **scrypt** KDF (`N=16384`, `r=8`, `p=1`, 16-byte salt)
- Directory `~/.maskmcp` at **0o700**, vault file at **0o600**
- Aliases `/^[A-Z0-9_]{2,64}$/`; reserved keys (`__proto__`, `constructor`, `prototype`) rejected
- Each secret has an **allowedDomains** allowlist (exact host or legitimate subdomain)
- MCP tools never return secret values. `mask_fetch` injects them into HTTPS only
- Anti-SSRF: `https` only; blocks localhost, link-local, and private IPs (including DNS results)
- Redirects are not followed (`redirect: "manual"`)
- Responses are size-capped (1 MB); binaries are not dumped into context
- Bidirectional redaction of the secret and its `encodeURIComponent` form as `[REDACTED_SECRET]`
- MCP stdio never writes informational logs to **stdout** (`console.error` only)

## Quickstart

Node.js 20+ required.

**1. Initialize the vault**

```bash
npx @pablo_estv/maskmcp init
```

**2. Wire Cursor**

```bash
npx @pablo_estv/maskmcp setup-cursor
```

`.cursor/mcp.json` (master key is stored in env, never printed by setup-cursor):

```json
{
  "mcpServers": {
    "maskmcp": {
      "command": "npx",
      "args": ["-y", "@pablo_estv/maskmcp"],
      "env": {
        "MASKMCP_MASTER_KEY": "your-master-key"
      }
    }
  }
}
```

**3. Store a secret with an allowlist, then fetch via the agent**

```bash
npx @pablo_estv/maskmcp set OPENAI_API_KEY --domains api.openai.com
```

In Cursor: *“List my MaskMCP secrets”* or *“Use OPENAI_API_KEY to GET https://api.openai.com/v1/models.”*

```bash
npm install -g @pablo_estv/maskmcp
```

## CLI

| Command | Description |
| --- | --- |
| `npx @pablo_estv/maskmcp init` | Create `~/.maskmcp/vault.json`; optional Cursor setup |
| `npx @pablo_estv/maskmcp set <alias> [value] --domains <csv>` | Encrypt and store (hidden prompt if value omitted) |
| `npx @pablo_estv/maskmcp get <alias>` | Decrypt locally in the terminal (not via MCP) |
| `npx @pablo_estv/maskmcp list` | Alias, allowlist, updatedAt |
| `npx @pablo_estv/maskmcp remove <alias>` | Delete after confirmation (`--yes` to skip) |
| `npx @pablo_estv/maskmcp setup-cursor` | Print/write Cursor MCP config (`--print`, `--write`) |
| `npx @pablo_estv/maskmcp serve` | MCP stdio server (default with no args) |

## MCP tools

| Tool | What it does |
| --- | --- |
| `mask_ping` | Liveness check |
| `mask_list_secrets` | `{ alias, allowedDomains, updatedAt }[]` |
| `mask_has_secret` | `{ exists: boolean }` |
| `mask_fetch` | HTTPS request with in-process auth injection; returns `{ status, statusText, headers, data }` |

`mask_fetch` parameters: `alias`, `url`, `method` (GET default), `headers`, `body`, `authType` (`Bearer` \| `Header` \| `Query`), `headerName`, `queryParamName`. Master key comes only from `MASKMCP_MASTER_KEY`.

## Cursor chat example

```text
You: What secrets are in my MaskMCP vault?
Agent: → mask_list_secrets
        [{ "alias": "OPENAI_API_KEY", "allowedDomains": ["api.openai.com"], "updatedAt": "..." }]

You: Call https://api.openai.com/v1/models with OPENAI_API_KEY.
Agent: → mask_fetch { "alias": "OPENAI_API_KEY", "url": "https://api.openai.com/v1/models" }
        { "status": 200, "data": { ... } }
```

The model never receives the token. Do not paste master keys into chat.

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT © 2026 Pablo Estévez Sanz
