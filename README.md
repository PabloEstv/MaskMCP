# maskmcp

Servidor MCP **local-first** para gestionar secretos y credenciales de forma segura para agentes de IA y Cursor.

Comunica por **stdio** (JSON-RPC). No escribas logs en `stdout`: está reservado al protocolo. Usa `stderr`.

## Requisitos

- Node.js >= 20

## Scripts

```bash
npm install
npm run build       # compila TypeScript a dist/
npm run dev         # ejecuta con tsx en watch
npm start           # arranca dist/index.js
npm run test:vault  # verifica cifrado AES-256-GCM y persistencia local
```

## Vault local

Los secretos se guardan en `~/.maskmcp/vault.json` (directorio `0o700`, archivo `0o600`). Cada valor va cifrado con AES-256-GCM (clave derivada con scrypt); los alias quedan en claro para poder listarlos sin la clave maestra.

## Cursor

Añade esto en `~/.cursor/mcp.json` (ajusta la ruta absoluta):

```json
{
  "mcpServers": {
    "maskmcp": {
      "command": "node",
      "args": ["/ruta/absoluta/MaskMCP/dist/index.js"]
    }
  }
}
```

Tras `npm run build`, Cursor debe ver la herramienta `ping` (responde `pong`).

## Estado

Núcleo cripto y vault local implementados. Herramientas MCP de secretos: pendiente. Ver `estado.md`.
