# maskmcp

Servidor MCP **local-first** para gestionar secretos y credenciales de forma segura para agentes de IA y Cursor.

Sin argumentos (o `serve`) arranca el servidor MCP por **stdio**. No escribas logs en `stdout` en ese modo. Los subcomandos CLI sí usan la terminal.

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
npm run cli -- list # CLI (tsx)
```

## CLI

```bash
maskmcp init
maskmcp set ALIAS [value]
maskmcp get ALIAS
maskmcp list
maskmcp remove ALIAS
maskmcp setup-cursor --print
maskmcp serve
```

La master key se toma de `MASKMCP_MASTER_KEY` o se pide oculta. No se guarda en `~/.maskmcp`; `setup-cursor` puede incluirla solo en el `env` de `.cursor/mcp.json`.

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

Tras `npm run build`, usa `maskmcp setup-cursor` para generar este JSON, o `maskmcp setup-cursor --write` para crear `./.cursor/mcp.json`.

## Estado

CLI y servidor MCP listos. Ver `estado.md`.
