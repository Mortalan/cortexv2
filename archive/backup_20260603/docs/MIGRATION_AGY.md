# CORTEX: ANTIGRAVITY CLI MIGRATION GUIDE
## [MAY 2026]

### 1. OVERVIEW
Google has announced the transition from Gemini CLI to **Antigravity CLI (agy)**. This document outlines the steps taken to ensure Project CORTEX remains compatible and the migration path for the developer.

### 2. MIGRATION STATUS
- **Core Files:** Project state is decoupled from the CLI. All "memory" is in `.md` files (CORTEX_MAP, LAB_LOG).
- **Startup Command:** Updated in `CORTEX_MAP.md` and `archive/CORTEX_MASTER_DOC.md` to use the `agy` prefix.
- **Skills/Hooks:** Gemini CLI `.geminiignore` and custom skills will be imported using the `agy migrate` tool.

### 3. DEVELOPER STEPS (LOCAL MACHINE)
1. **Install Antigravity CLI:**
   ```bash
   npm install -g @google/antigravity-cli
   ```
2. **Import Gemini Configuration:**
   ```bash
   agy migrate --from gemini
   ```
3. **Verify Connection:**
   ```bash
   agy status
   ```

### 4. AGENT OPERATIONAL CHANGES
- **Command Prefix:** All slash commands now use `agy` (e.g., `/help` -> `agy help`).
- **Asynchronicity:** Antigravity supports background tasking; use `agy run --bg` for long-running builds or research.
- **TUI Interface:** The new CLI provides a rich terminal interface for monitoring agent thought processes.

### 5. PROJECT IMPACT
- **Zero Data Loss:** Since CORTEX uses a file-based memory system, the transition is purely a tooling change.
- **Performance:** Expect faster execution of Three.js builds and documentation syncing.

---
*Last Updated: Wednesday, 20 May 2026*
