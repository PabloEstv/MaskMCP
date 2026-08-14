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
