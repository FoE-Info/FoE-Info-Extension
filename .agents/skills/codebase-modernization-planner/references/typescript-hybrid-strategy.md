# Hybrid TypeScript Coexistence & Migration Strategy

Strategy for introducing TypeScript into FoE-Info alongside existing JavaScript without breaking builds, test runners, or runtime execution.

---

## 1. Core Principles

1. **Dual Extension Support (`.ts` and `.js`)**:
   - Webpack resolves both extensions seamlessly: `resolve: { extensions: ['.ts', '.js', '.mjs', '.json'] }`.
   - Once a module is migrated (Phase 2+), JavaScript and TypeScript files import each other with standard ES module syntax and explicit relative extensions.
2. **Zero Runtime Impact**:
   - Transpilation produces standard ES2022 JavaScript bundled into the same distribution chunks.
   - Zero changes to Manifest V3 permissions or background service worker lifecycle.
3. **No Blind Global Refactoring**:
   - Do NOT attempt to convert the whole repository at once.
   - Leaf modules (with no outgoing internal dependencies) are converted first.

---

## 2. Infrastructure Setup (Phase 0)

### Compiler Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": true,
    "checkJs": false,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "types": ["chrome", "webextension-polyfill", "node"]
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- `allowJs: true`: Allows TypeScript compiler to understand existing JS files.
- `checkJs: false`: Prevents type errors on untyped legacy JS files during initial migration.
- `noEmit: true`: Webpack handles bundling; `tsc` is used purely for type-checking (`npm run typecheck`).

### Build Integration

- Webpack bundles `.ts` through `ts-loader` with `transpileOnly: true` (configured in `webpack.common.js`) for fast dev builds.
- Dedicated type-checking script in `package.json`: `"typecheck": "tsc --noEmit"`.

### Test Execution (Node >= 24)

- `npm test` runs `node --test tests/**/*.test.mjs`; migrated `.ts` modules execute natively through Node `>=24` type stripping — no `tsx`/`ts-node` dependency (verified on Node 26.8.2).
- Constraints: **erasable syntax only** (no `enum`, `namespace`, parameter properties, or `import =`) and **explicit relative extensions** on internal imports.

### Phase 0 Outcome

- The 12 dead `.ts` mirrors were deleted in Phase 0, keeping the authoritative `.js` as the single source of truth. Real TypeScript is authored from that `.js` in Phase 2 rather than resurrected from the deleted mirrors.

---

## 3. Leaf-First Conversion Sequence

```text
Level 0: Type Definitions (Ambient interfaces)
  └─ src/types/foe-rpc.d.ts (InnoGames JSON-RPC request & response contracts)
  └─ src/types/state.d.ts (MetadataStore & in-memory state shapes)

Level 1: Pure Calculation Engines (Zero DOM dependencies)
  └─ src/js/calc/BlueGalaxyCalculator.ts
  └─ src/js/calc/boosts/MilitaryBoostCalculator.ts
  └─ src/js/calc/goods/GoodsCalculator.ts
  └─ src/js/calc/prod/ProductionCalculator.ts
  └─ src/js/calc/units/UnitCalculator.ts

Level 2: In-Memory State & Protocol Handlers
  └─ src/js/state/MetadataStore.ts
  └─ src/js/state/BlueGalaxyState.ts
  └─ src/js/protocol/MessageDispatcher.ts

Level 3: Domain Service Handlers
  └─ src/js/msg/*Service.ts (decoupled from monoliths)

Level 4: UI Components & Templates
  └─ src/js/ui/components/*.ts

Level 5: Root Orchestrators (Thin entry points)
  └─ src/js/index.ts (final step)
```
