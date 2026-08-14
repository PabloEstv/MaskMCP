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
npm run test:tools  # verifica las herramientas MCP en memoria
```

## Vault local

Los secretos se guardan en `~/.maskmcp/vault.json` (directorio `0o700`, archivo `0o600`). Cada valor va cifrado con AES-256-GCM (clave derivada con scrypt); los alias quedan en claro para poder listarlos sin la clave maestra.

La `masterKey` se toma del argumento de la tool o de `MASKMCP_MASTER_KEY`.

## Herramientas MCP

- `ping` — smoke test
- `mask_list_secrets` — lista alias y fechas (sin valores)
- `mask_has_secret` — comprueba si un alias existe
- `mask_set_secret` — cifra y guarda un secreto
- `mask_get_secret` — descifra y devuelve un secreto
- `mask_remove_secret` — elimina un alias
- `mask_export_template` — plantilla `ALIAS=mask:ALIAS` (env o json)

## Cursor

Añade esto en `~/.cursor/mcp.json` (ajusta la ruta absoluta):

```json
{
  "mcpServers": {
    "maskmcp": {
      "command": "node",
      "args": ["/ruta/absoluta/MaskMCP/dist/index.js"],
      "env": {
        "MASKMCP_MASTER_KEY": "tu-clave-maestra"
      }
    }
  }
}
```

Tras `npm run build`, Cursor debe listar las herramientas `mask_*`.

## Estado

Herramientas MCP de secretos implementadas. Ver `estado.md`.
