# maskmcp

Servidor MCP **local-first** para gestionar secretos y credenciales de forma segura para agentes de IA y Cursor.

Comunica por **stdio** (JSON-RPC). No escribas logs en `stdout`: está reservado al protocolo. Usa `stderr`.

## Requisitos

- Node.js >= 20

## Scripts

```bash
npm install
npm run build    # compila TypeScript a dist/
npm run dev      # ejecuta con tsx en watch
npm start        # arranca dist/index.js
```

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

El cifrado y el storage del vault aún no están implementados. Ver `estado.md`.
