# Estado del proyecto

## Cambio 1 — 2026-08-14

Scaffold inicial del servidor MCP local-first **maskmcp**.

- **Qué:** proyecto Node.js ESM (NodeNext) con servidor MCP stdio, herramienta de prueba `ping`, y carpetas `core/` / `tools/` listas para cifrado y secretos.
- **Archivos:** `package.json`, `tsconfig.json`, `.gitignore`, `README.md`, `src/index.ts`, `src/server.ts`, `src/config.ts`, `src/tools/ping.ts`, `src/tools/index.ts`, `src/core/.gitkeep`.
- **Estado:** el servidor arranca por stdio con `McpServer` (`@modelcontextprotocol/sdk` v1) + `StdioServerTransport`. Cifrado, vault y herramientas de secretos: pendiente.

## Cambio 2 — 2026-08-14

- **Qué:** `tsconfig.json` incluye `"types": ["node"]` para que TypeScript 7 resuelva `@types/node`.
- **Archivos:** `tsconfig.json`.
- **Estado:** `npm run build` compila sin errores y genera `dist/`.

## Cambio 3 — 2026-08-14

Núcleo criptográfico y vault local (Fase 2).

- **Qué:** AES-256-GCM + scrypt (`node:crypto`), `LocalVaultManager` sobre `~/.maskmcp/vault.json` (valores cifrados, alias en claro, permisos `0o700`/`0o600`), y script `test:vault` aislado en tmp.
- **Archivos:** `src/core/types.ts`, `src/core/crypto.ts`, `src/core/vault.ts`, `src/core/index.ts`, `src/core/test-vault.ts`, `src/config.ts`, `package.json`, `README.md`.
- **Estado:** cifrado y persistencia listos. Herramientas MCP de secretos: pendiente.

## Cambio 4 — 2026-08-14

Herramientas MCP de secretos (Fase 3).

- **Qué:** tools `mask_list_secrets`, `mask_has_secret`, `mask_set_secret`, `mask_get_secret`, `mask_remove_secret` y `mask_export_template` con Zod; `masterKey` por argumento o `MASKMCP_MASTER_KEY`; test de integración en memoria.
- **Archivos:** `src/tools/helpers.ts`, `src/tools/list.ts`, `src/tools/has.ts`, `src/tools/set.ts`, `src/tools/get.ts`, `src/tools/remove.ts`, `src/tools/template.ts`, `src/tools/index.ts`, `src/tools/test-tools.ts`, `package.json`, `README.md`.
- **Estado:** tools MCP listas. `ping` se mantiene.

## Cambio 5 — 2026-08-14

CLI interactiva (Fase 4).

- **Qué:** router MCP vs CLI; comandos `init`, `set`, `get`, `list`, `remove`, `setup-cursor` y `serve`; master key solo por env o prompt (opcional en `.cursor/mcp.json` env).
- **Archivos:** `src/index.ts`, `src/cli/*`, `package.json`, `README.md`.
- **Estado:** CLI lista. `maskmcp` sin args sigue siendo el servidor stdio.

## Cambio 6 — 2026-08-14

Empaquetado y docs para npm/GitHub (Fase 6).

- **Qué:** `maskmcp@1.0.0`, LICENSE MIT (Pablo Estévez Sanz), README en inglés, `files`/`publishConfig`, ignores de vault/env/tmp, script `npm test`.
- **Archivos:** `package.json`, `LICENSE`, `README.md`, `.gitignore`, `.npmignore`, `src/config.ts`.
- **Estado:** listo para publicar. No se ha ejecutado `npm publish` ni push.

## Cambio 7 — 2026-08-15

README apunta al paquete npm publicado `@pablo_estv/maskmcp`.

- **Qué:** `npx @pablo_estv/maskmcp`, install global, badge/enlace npm, y `mcp.json` con `npx -y @pablo_estv/maskmcp`.
- **Archivos:** `README.md`.
- **Estado:** docs alineadas con el nombre oficial en npm.
