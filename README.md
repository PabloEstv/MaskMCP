# MaskMCP

[![npm](https://img.shields.io/npm/v/@pablo_estv/maskmcp.svg)](https://www.npmjs.com/package/@pablo_estv/maskmcp)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)
[![MCP ready](https://img.shields.io/badge/MCP-ready-purple.svg)](https://modelcontextprotocol.io)

**Zero-knowledge, local-first MCP vault** for AI agents. Keep API keys and credentials on your machine — encrypted — and let Cursor or Claude request them only when a tool call needs them.

MaskMCP exists because pasting secrets into a chat (or leaving them in `.env` files the model can read) leaks them into context, logs, and transcripts. The vault lives at `~/.maskmcp/vault.json`. Values are encrypted; aliases can be listed without the master key.

Package: [`@pablo_estv/maskmcp`](https://www.npmjs.com/package/@pablo_estv/maskmcp)

## Security guarantees

- **AES-256-GCM** authenticated encryption per secret
- **scrypt** KDF (`N=16384`, `r=8`, `p=1`, 16-byte salt) — memory-hard, native `node:crypto`
- Directory `~/.maskmcp` at **0o700**, vault file at **0o600**
- Aliases stored in plaintext so `list` / `has` / templates never decrypt values
- The master key is **not** written to the vault; optional only as `MASKMCP_MASTER_KEY` in Cursor `mcp.json` `env`
- MCP stdio mode never writes to **stdout** (JSON-RPC only; logs go to stderr)
- Auth failures return a generic error — no ciphertext, plaintext, or key material in messages

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

This prints (and can write) `.cursor/mcp.json`:

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

**3. Store a secret and use it in chat**

```bash
npx @pablo_estv/maskmcp set OPENAI_API_KEY
```

Then in Cursor: *“List my MaskMCP secrets”* or *“Get OPENAI_API_KEY from the vault.”*

Optional global install:

```bash
npm install -g @pablo_estv/maskmcp
```

## CLI

| Command | Description |
| --- | --- |
| `npx @pablo_estv/maskmcp init` | Create `~/.maskmcp/vault.json`; optional Cursor setup |
| `npx @pablo_estv/maskmcp set <alias> [value]` | Encrypt and store a secret (hidden prompt if value omitted) |
| `npx @pablo_estv/maskmcp get <alias>` | Decrypt; print or copy to clipboard |
| `npx @pablo_estv/maskmcp list` | Table of aliases and timestamps (no values) |
| `npx @pablo_estv/maskmcp remove <alias>` | Delete after confirmation (`--yes` to skip) |
| `npx @pablo_estv/maskmcp setup-cursor` | Print/write Cursor MCP config (`--print`, `--write`) |
| `npx @pablo_estv/maskmcp serve` | Start the MCP server on stdio (default when invoked with no args) |

Master key resolution: `MASKMCP_MASTER_KEY` environment variable, otherwise an interactive hidden prompt.

## MCP tools

| Tool | What it does |
| --- | --- |
| `mask_list_secrets` | JSON list of `{ alias, createdAt, updatedAt }` |
| `mask_has_secret` | `{ exists: boolean }` for an alias |
| `mask_set_secret` | Encrypt and store (`alias`, `value`, optional `masterKey`, `metadata`) |
| `mask_get_secret` | Decrypt and return the value |
| `mask_remove_secret` | Delete an alias |
| `mask_export_template` | Env or JSON template (`OPENAI_API_KEY=mask:OPENAI_API_KEY`) |

`masterKey` on mutating/decrypt tools is optional when `MASKMCP_MASTER_KEY` is set in the MCP server env.

## Cursor chat example

```text
You: What secrets are in my MaskMCP vault?
Agent: → mask_list_secrets
        [{ "alias": "OPENAI_API_KEY", "createdAt": "...", "updatedAt": "..." }]

You: Export an .env template.
Agent: → mask_export_template { "format": "env" }
        OPENAI_API_KEY=mask:OPENAI_API_KEY

You: Decrypt OPENAI_API_KEY.
Agent: → mask_get_secret { "alias": "OPENAI_API_KEY" }
        sk-...
```

Do not paste master keys into the chat if they are already in `mcp.json` `env`.

## Development

```bash
npm install
npm run build
npm test
```

- `npm run cli -- list` — run the CLI via tsx
- `npm start` — MCP stdio server from `dist/`

## License

MIT © 2026 Pablo Estévez Sanz
