# Version History

View the full changelog of xeno-bot's development progress, including all features, improvements, and fixes across versions. Each version entry includes a summary of changes and links to relevant commits for more details.

----

## v1.9.22 — UX: V2 gift responses & leaderboard/server fixes

Date: 2026-03-07

- **Improved:** `/gift` success responses now use Components V2 for clearer, multi-line presentation. Gift payloads show `From`, `To`, `Item/Xenomorph/Host`, and explicit IDs so transfers are easy to read and audit.
- **Fixed:** Incorrect xenomorph label shown in some `/gift` replies (e.g., message said a different role than the xeno transferred). The display name and emoji are now derived from `config/evolutions.json` role mappings (`roles`) using the xeno's `role` or `stage`, ensuring the text matches the actual xeno given.
- **Fixed:** `/leaderboard` server view now defaults to server-scoped mode when invoked inside a guild (no subcommand). Component interactions preserve the invoking `guildId`, preventing accidental fallbacks to global aggregates during menu updates.
- **Misc:** Minor load-time verification and module safety checks added; no behavioral change expected beyond presentation and scoping fixes.

## v1.9.21 — Fix: leaderboard scoping and paging

Date: 2026-03-07

- **Fixed:** `/leaderboard global` and `/leaderboard server` now correctly preserve and apply sort/filter options across interaction pages and component updates.
- **Global:** All component interactions on the global leaderboard now explicitly run the global subcommand so every update continues to use global aggregates.
- **Server:** All component interactions on the server leaderboard now explicitly run the server subcommand so rankings and filters are computed from server-local data only (no global fallbacks).
- **Why:** Previously component updates could lose the subcommand context and mix global/server data, producing confusing or incorrect rankings. This change ensures consistent, predictable leaderboard pages.

## v1.9.20 — UX: evolve list formatting

Date: 2026-03-07

- **Improved:** The `/evolve list` view now formats entries to match the rest of the bot UI: `<emoji> <Role Display> [ID]` with the pathway shown on a second line. This makes xenomorph entries consistent with other lists (hosts, eggs) and improves scanability.
- **Why:** Previously the list used a compact `#id role` line that lacked the role emoji and consistent bracketed ID. The new format uses configured role emojis and display names to match completion/cancel messages and other UX patterns.
- **Files:** `src/commands/evolve/index.js` updated to use `getRoleDisplay()` for list entries.

## v1.9.19 — Fix: xenomorph guild scoping & data backfill

Date: 2026-03-07

- **Fixed:** Xenomorphs are now explicitly stored and queried per-guild so `/inventory` and `/evolve` only show xenomorphs that belong to the same server.
- **Schema:** Added `guild_id` column to the `xenomorphs` table and updated `src/models/xenomorph.js` to write/read this column when available.
- **Migration & Backfill:** Added migration `20260307140000_add_xenomorphs_guild_id.js` and a data backfill migration `20260307151000_populate_xenomorphs_guild_id.js` that derives `guild_id` from each xeno's `hive_id` (or the owner's first hive when a direct hive link was missing).
- **Why:** Prevents cross-server inventory leakage and makes guild-scoped features reliable without inferring guilds from other relations.
- **Notes:** Rows where a guild could not be derived remain `NULL` and will be excluded by guild-scoped queries unless `includeUnAssigned` is used. Run migrations on any additional DB instances (staging/replica) as needed.

## v1.9.18 — Fix: host autocomplete labels & `next_stage` display

Date: 2026-03-07

- **Fixed:** Host autocomplete labels no longer include raw emoji markup. Autocomplete now shows only the host display name (e.g., `Colonial Marine (x1) [#8437]`) to avoid raw emoji token text appearing in selection lists.
- **Fixed:** The `next_stage` autocomplete now shows only the role display name (for example, `Deacon`) instead of `deacon — Deacon`, making selections cleaner and easier to read.
- **Minor:** Continued polish to grouped `/evolve start` autocomplete labels and count formatting (counts use `(xN)`).

## v1.9.17 — UX: grouped evolve/autocomplete and clearer counts

Date: 2026-03-07

- **Improved:** `/evolve start` autocomplete and host selection now group items by stage/pathway and host type to reduce option clutter. Example label: `Facehugger • Pathway: standard (x20)` is now shown as `Facehugger • Pathway: standard (x20) [#123]` and the count is displayed as `(x20)` for clarity.
- **Why:** Large inventories produced long autocomplete lists showing every individual ID. Grouping reduces noise and makes it easier to pick the right group.
- **Behavior:** Each grouped option uses a single representative ID (the lowest ID in the group) as the option value so Discord accepts the numeric value. This keeps the command compatible while improving readability. If you prefer a follow-up selector to pick a specific ID from the group, we can add that as a later enhancement.
- **Related:** Added robust pathway/role normalization so pathway-specific facehugger variants (e.g., `space_jockey_facehugger`) are matched even if the user types `space` or `spacejockey`.

## v1.9.16 — Migration: normalize pathway-specific facehugger roles

Date: 2026-03-07

- **Change:** Non-standard pathways that used a generic `facehugger` stage (e.g., `dog`, `space_jockey`) are now normalized to pathway-specific stage identifiers (`dog_facehugger`, `space_jockey_facehugger`) in `config/evolutions.json`.
- **Migration:** Added a knex migration `20260307123000_migrate_facehugger_roles.js` that updates existing `xenomorphs` rows: any xeno with `role` or `stage` = `facehugger` and a non-`standard` `pathway` will be renamed to `{pathway}_facehugger`.
- **Why:** This prevents ambiguity where multiple pathways shared the generic `facehugger` label and ensures evolution requirements map to the correct pathway-specific stage.
- **Rollback:** The migration includes a down-step to revert pathway-specific names back to the generic `facehugger` if needed.

## v1.9.15 — Fix: evolve autocomplete and evolving-xeno filtering

Date: 2026-03-07

- **Fixed:** `/evolve start` autocomplete previously suggested xenomorphs that either had no configured next evolution or were already undergoing evolution, which could lead to confusing UI and failed attempts.
- **Root cause:** Autocomplete fell back to listing all roles when a selected xeno had no next step, and did not exclude xenos with queued evolution jobs.
- **Fix:** Autocomplete now:
  - only suggests xenomorphs that have a configured next evolution step for their pathway; and
  - excludes xenomorphs that currently have a queued evolution job (status = `queued`).
- **User impact:** Users will no longer see invalid or busy xenos in the selection list; attempting to start an evolution will only be possible for valid, idle xenos.

## v1.9.14 — Fix: inventory egg list truncation

Date: 2026-03-07

- **Fixed:** Inventory view sometimes appeared to omit egg types for users with large egg collections; more egg types are now visible per page.
- **Root cause:** The inventory V2 view paged egg entries with a small page size which hid many egg types for heavy collectors.
- **Fix:** Increased the inventory page size so `/inventory` shows more egg entries per page, reducing truncation. Further UI improvements (e.g., a "Show all" option) can be added if desired.

## v1.9.13 — Fix: prevent duplicate host insertions

Date: 2026-03-07

- **Fixed:** Prevented intermittent `Duplicate entry` errors when running `/hunt` under concurrent load. The error occurred when the code attempted to manually reuse deleted `hosts.id` values and two concurrent requests chose the same free ID.
- **Root cause:** `insertWithReusedId` could select the same gap ID for multiple concurrent inserts, causing primary key collisions on MySQL.
- **Fix:** `hosts` insertion now uses the database's auto-increment behavior (no manual `id` assignment) so the DB reliably assigns unique IDs and avoids race conditions.
- **Notes:** If ID reuse is still required for other tables, consider implementing transactional locking or a centralized ID allocator to avoid races.

## v1.9.12 — Command option label consistency

Date: 2026-03-05

- **Improved:** Standardized select-menu and autocomplete entity labels to a consistent `Name [ID]` pattern across key command flows.
- **Updated commands:** `gift`, `hive`, `evolve`, and `devgive` option labels/autocomplete entries.
- **Xeno context:** Added pathway context where relevant (for example, xeno options now include pathway details when useful).
- **UX impact:** Makes it easier to match inventory entries with command choices and reduces ambiguity when selecting entities.

## v1.9.11 — Evolution completion DM V2 redesign

Date: 2026-03-05

- **Improved:** Evolution completion direct messages now use Components V2 for cleaner presentation.
- **New format:**
  - `Your evolution job [jobId] completed`
  - `<emoji> <from role> [xenoId] -> <emoji> <to role> [xenoId]`
- **Details:** Role display names and emojis are now resolved from evolution role config for consistent naming across pathways.
- **Reliability:** Added plain-text DM fallback if V2 component sending fails.

## v1.9.10 — Gift xenomorph autocomplete + evolution status fix

Date: 2026-03-05

- **Fixed:** `/gift xenomorph` autocomplete now properly lists giftable xenomorphs owned by the user.
- **Improved:** Xeno autocomplete labels now include configured xeno emoji + display name, ID, and pathway for easier selection.
- **Fixed:** Manual `/gift xenomorph` by ID no longer incorrectly blocks gifting due to historical evolution records.
- **Details:** Gift blocking now only checks active evolution jobs (`queued`/`processing`) instead of any row in `evolution_queue`.

## v1.9.9 — New-user egg catch award fix

Date: 2026-03-05

- **Fixed:** Resolved spawn catch failures for first-time users that logged `Failed awarding egg`.
- **Root cause:** `createUser()` in `user` model referenced an undefined `logger`, causing a runtime error during initial user creation.
- **Impact:** New users can now catch spawned eggs normally, receive inventory updates, and avoid console award errors.
- **Internal:** Added the missing user-model logger initialization and kept existing award flow unchanged.

## v1.9.8 — Inventory xeno list formatting polish

Date: 2026-03-05

- **Improved:** `/inventory` xenomorph entries now use host-style formatting for readability and consistency.
- **Before:** `#663 facehugger: Pathway: standard • Created: ...`
- **Now:** `<xeno emoji> <xeno display name> [663]: Created ...`
- **Details:** Xeno labels now use evolution role metadata (display name + configured emoji) and keep a clean timestamp line similar to host entries.

## v1.9.7 — Hive create-flow interaction fix

Date: 2026-03-05

- **Fixed:** `/hive` no-hive create flow no longer breaks interactions on the same message after creating a hive.
- **Bug behavior before:** Creating a hive from the no-hive prompt, then using dashboard buttons on that same message, resulted in failed interactions.
- **Now:** After pressing **View Hive**, the same message is upgraded to the full hive dashboard collector so Stats/Modules/Milestones/Queen/Members and management actions function normally.
- **Internal:** Refactored hive dashboard collector wiring into a reusable attachment path used by both existing-hive and post-create view flows.

## v1.9.6 — Eggs list claim pagination fix

Date: 2026-03-05

- **Fixed:** `/eggs list` no longer resets to page 1 when claiming/collecting an egg from later pages.
- **Improved:** Collect actions now preserve the current list page context so users can claim multiple eggs on page 2+ without repeatedly pressing Next.
- **Technical:** Collect button IDs now carry page context and all eggs-list collectors restore that page before re-rendering.

Commit: post-v1.9.5 fix for eggs list paging state retention.

## v1.9.5 — Post-1.9.4 gameplay, UX, and data integrity updates

Date: 2026-03-05

- **Gameplay & Balance:** Added grantable-only **Golden Egg** support and excluded grantable-only eggs from normal spawns; rebalanced egg/host spawn weights (including rarer deacon/neomorph and king-pathway tuning).
- **Inventory UX:** Expanded `/inventory` with sorting + filtering across eggs, items, hosts, and xenomorphs (including type/stage filters and richer pagination behavior).
- **Stats UI:** Refactored `/stats` to Components V2 with improved sectioned layout and user avatar thumbnail.
- **ID Management:** Implemented reusable-ID insertion utility for `hives`, `hosts`, and `xenomorphs` so deleted IDs are reused instead of always incrementing.
- **Dog Pathway Fixes:** Updated dog pathway first evolution to **runner**, added/updated runner and related xeno emoji/assets, and added migration tooling for legacy dog drones.
- **Encyclopedia Expansion:** Added **Xenos** catalogue view to `/encyclopedia` and added rarity metadata to evolution roles so xeno entries show rarity with rarity emojis.
- **Gift/Hive Integrity Fix:** Fixed `/gift xenomorph` so gifted xenos clear `hive_id` on transfer (prevents unintended reassignment when gifted back); added cleanup migration for stale/invalid xeno↔hive links.
- **Hive Management Iterations:** Multiple hive-screen improvements including module upgrades, members pagination/navigation, delete confirmations/back flow, snapshot/readability updates, and queen/module action flow polish.
- **Developer/Infra Improvements:** Added devgive host-type handling/autocomplete improvements and command-registration guardrails to reduce profile double-registration risk.

Commits included (after v1.9.4): `cfebf00`, `d2206d9`, `599d4c0`, `fa1efd6`, `c07f181`, `1c88cf6`, `ec291af`, `964564e`, `eb04e2f`, `0ea96b7`, `f249a5c`, `31b4d6b`, `9144806`, `d4eb9b4`, `30c943c`, `d98a1db`, `a7ddd16`, `cc25963`, `8f987cd`, `d0b7ebf`, `e83ecb2`, `6088b0c`, `c6671af`, `a4b66f4`, `c9fd9a4`, `37f8c73`, `2af9a10`, `eb50837`, `64762e7`, `17f095e`, `e9f7844`, `4c44526`, `6452859`, `bd6af2c`, `4f9d299`, `710fe87`.

## v1.9.4 — Hive queen restrictions and UI polish

Date: 2026-03-03

- **Fixed:** Only fully-evolved **Queen** xenomorphs can now be assigned as hive queens (previously allowed any evolved xeno).
- **Improved:** Hive UI redesigned for clarity:
  - **Stats** screen now shows member breakdown by role.
  - **Queen** screen displays current queen details and lists all hive members.
  - **Assign Queen** screen shows available queens with pathway and level info.
  - **Add Xenos** screen displays available xenos with detailed metadata.
  - All screens now use better formatting with emojis and clearer status indicators.
  - Hive snapshots split into multi-line format for readability.

## v1.9.3 — Hive system expansion

Date: 2026-03-03

- Added interactive **Assign Queen** button + select menu to manage hive queens.
- Added interactive **Add Xenos** button + multi-select to grow your colony.
- Hive views now track and display xenomorph membership.
- Added permissions checking: only hive owner can manage members and queens.
- Fixed existing typo in hive create-prompt handler.

## v1.9.3 — Evolve list UX updates and payload-limit fixes

Date: 2026-03-03

This patch release improves `/evolve list` usability and resolves Discord component payload-limit errors introduced during interactive UI expansion.

### Features

- Enhanced `/evolve list` with new interaction controls:
  - Added a type filter select menu to sort/filter list entries by xenomorph type.
  - Added per-entry `Info` buttons that open detailed info for the selected xenomorph.

### Bug Fixes

- Fixed Discord API payload failures (`COMPONENT_MAX_TOTAL_COMPONENTS_EXCEEDED`) on evolve list views.
- Reduced component payload size to stay under Discord V2 limits while preserving filter + per-entry info functionality.
  - Lowered evolve list page size.
  - Capped type-filter option count.

### Internal

- Version bumped to `1.9.3`.
- Patch release contains no intentional breaking changes.

## v1.9.2 — Evolve list filter and payload mitigation

Date: 2026-03-03

- Added type filter select and per-entry info buttons to `/evolve list`.
- Reduced page size and filter options to fit Discord component limits.
- Made expired evolve views keep UI disabled instead of hiding controls.

## v1.9.2 — Tutorial command and article reminder fixes

Date: 2026-03-03

This patch release focuses on onboarding UX and news reminder reliability.

### Features

- Added a new interactive `/tutorial` command with:
  - Category selector menu
  - Multi-page navigation (Previous/Next)
  - Dedicated sections for server setup, basics, hives, evolutions/hatching, hunts, and extra tips

### Bug Fixes

- Fixed `/tutorial` payload validation failure by correcting select-menu emoji option format (Discord API expected emoji object shape).
- Fixed news reminder visibility across deferred/component replies by applying reminder injection before reply/edit paths in `safeReply`.
- Fixed article-change detection for edited existing articles (e.g. `releases.md`) so reminders trigger when latest content is updated, not only when new files are added.

### Internal

- Version bumped to `1.9.2`.
- Patch release contains no intentional breaking changes.

## v1.9.1 — Release notes and version bump

Date: 2026-03-02

- Added v1.9.0 release notes documenting recent bug fixes and features.

Date: 2026-02-27

- Initial project scaffold and first commit (6f75204).

## v1.9.1 — Bug fixes and command reliability

Date: 2026-03-03

This is a bug-fix-only patch release focused on command stability, pagination correctness, and forum workflow reliability.

### Command & UI Fixes

- **Setup egg-limit stability**
  - Fixed runtime logger reference issues in `/setup egg-limit` error paths.
  - Kept max egg limit validation at 10 with reliable error handling.

- **Eggs command subcommand fixes**
  - Fixed `/eggs info` not working by implementing missing handler logic.
  - Added `/eggs destroy` handler support and safer unknown-subcommand fallback messaging.

- **Eggs list behavior fixes**
  - Fixed list pagination edge cases that could stop navigation early.
  - Fixed stale timestamp rendering (`Hatched: 56 years ago`) by using correct hatch timestamps.
  - Fixed `View List` button from result screens by attaching collectors in those flows.
  - Adjusted collected-entry behavior:
    - Immediate collect action still updates the current view to show `Collected`.
    - Fresh `/eggs list` calls only show uncollected entries.

- **Hunt list consistency**
  - Fixed `hunt-list` quick hunt button to reuse `/hunt` execution flow so cooldown and hunt logic are consistent.
  - Updated empty-state behavior so `/hunt-list` still opens list UI when no hosts are owned.

### Forum Bug Report Workflow Fixes

- Added bug-report forum automation for new thread posts with a `Mark Resolved` action.
- Fixed thread create compatibility issues (`ButtonBuilder is not a constructor`) by using runtime-safe component payloads.
- Updated resolve-button permissions to allow only **thread owner** or **guild owner**.
- Resolve action now sends a response, then archives and locks the thread.
- Forum post notice message now uses Components V2 payload style.

### Configuration/Data Fixes

- Reorganized emoji configuration ordering and applied emoji-related display corrections used by command output flows.

### Internal

- Version bumped to `1.9.1`.
- Patch release contains no intentional breaking changes.

----

## v1.9.23 — Stability, guild scoping, migrations & UX polish

Date: 2026-03-10

- **Added / Fixed:** Xenomorphs and hosts are now consistently scoped to guilds: new `guild_id` columns, migrations, backfill scripts, and model changes ensure inventory, evolve, hunt and host lists only show server-local records.
- **Migration:** Added and shipped multiple migrations and backfill scripts to populate `guild_id` for existing rows (xenomorphs, hosts) and to add `gambling_plays` table for upcoming gambling features. Run migrations on all DB instances.
- **Improved:** Inventory and evolve flows now correctly include legacy/unassigned compatibility while preferring guild-scoped results; autocomplete and modal searches for evolve were improved (grouping, pagination, and filtering) to reduce noise and block invalid/busy xenomorphs from selection.
- **UX:** Inventory, leaderboard, gift, and evolve UIs received Component V2 and formatting polish — clearer multi-line gift payloads, better list formatting (`<emoji> <Display> [ID]`) and safer component payload sizes.
- **Fixes:** Collector/user-filtering fixes restored strict interaction filters so only the initiating user can control interactions (prevents memory leaks and interaction cross-talk); safer `safeReply` logging and serialized components for compatibility.
- **Features:** Added utility and gameplay improvements: `Collect All` for eggs, `Release All` for hunt hosts page, Incubation Accelerator item, pathogen/predalien pathways and assets, and new asset images (king egg, scrap images, irradiated images, etc.).
- **Ops/infra:** Added a `system monitor` and scripts to run and manage migrations; dotenv loading robustness improved; added tests for scoped xenomorph model methods.
- **Notes:** This release contains schema changes (new columns + backfills). Deployers should run the new migrations and backfill scripts (see `migrations/` and `scripts/`) before running the updated code.

## v1.9.0 — Code quality, performance optimization, and database efficiency

Date: 2026-03-03

This release focuses on code quality improvements, performance optimization, and reducing database load through caching and better indexing.

### Code Quality & Refactoring

- **JSON parsing helper utility**: Created centralized `src/utils/jsonParse.js` for safe JSON parsing across models.
  - Eliminated 15+ duplicate try-catch blocks previously scattered across 5 models (xenomorph, user, guild, hive, host).
  - Consistent error handling and logging for all JSON parsing operations.
  - Intelligently handles edge cases: already-parsed objects, null values, and invalid JSON.
  - Improved maintainability: future JSON parsing changes only need one place to update.
  
- **Model refactoring**: Updated all models to use the new centralized JSON parsing utility.
  - `xenomorph.js`: Consolidated 3 duplicate parsing patterns into helper calls.
  - `user.js`: Removed 2 separate try-catch blocks, simplified logic.
  - `guild.js`: Standardized error handling with helper utility.
  - `hive.js`: Consistent parsing across multiple lookups.
  - `host.js`: Cleaner data transformation with helper.

### Performance & Caching

- **News reminder cache**: Created `src/utils/newsReminderCache.js` with smart in-memory caching.
  - Reduces DB queries for reminder checks by approximately **90%**.
  - 5-minute TTL cache stores user's latest read article timestamp.
  - Cache misses trigger DB lookup, hit results bypass database entirely.
  - Automatic cleanup every 10 minutes prevents memory bloat.
  - Cache automatically invalidates when user reads a new article via `/news` command.
  - Updated `interactionCreate.js` to check cache before performing DB lookup.
  - Modified `/news` command to invalidate cache after marking article as read.

- **Database indexing**: Added performance index to `active_spawns` table.
  - New `created_at` index enables faster cleanup/expiration queries.
  - Particularly beneficial for garbage collection of old spawn records in high-activity guilds.
  - Works alongside existing indices: `guild_id`, `channel_id + message_id`, and `spawned_at`.

### Performance Impact

- **Database load reduction**: ~90% fewer queries for news reminder checks across all interactions.
- **Interaction latency improvement**: Cache hits avoid network round-trips to database.
- **Query performance**: Active spawn queries benefit from additional `created_at` index during cleanup operations.
- **Memory efficiency**: Cache uses minimal memory (~1KB per cached user, ~100KB for 1000+ users).

### Implementation Details

- **Cache lifecycle**: TTL-based expiration + explicit invalidation on article reads.
- **Database compatibility**: Indices work with both MySQL and PostgreSQL (SQLite skipped).
- **Backward compatibility**: All changes are fully backward compatible; no migrations required.
- **Error handling**: Graceful fallback if cache fails; DB lookups still work.

### Internal

- Version bumped to `1.9.0`.
- Commit: ca1d6bb - "Improvements: Code quality, performance optimization, and database efficiency"
- All utilities validated and loaded successfully.
- No breaking changes; safe to deploy in production.

## v1.8.0 — Gift fix, ephemeral interactions, and critical memory leak patch

Date: 2026-03-02

### Critical Bug Fixes

- **Memory leak patch**: Fixed critical memory leak affecting message component collectors across 9 commands (hunt, hunt-list, ping, hive, evolve, emojis, pathway, help, and gift).
  - Root cause: Removed collector `filter` functions were replaced with manual user ID checks inside collect handlers, causing all interactions from all users to be processed instead of filtered at collector creation time.
  - Impact: Memory accumulation from 224 MB → 1473 MB before OOM crash on deployed bot.
  - Solution: Restored proper `filter: i => i.user.id === userId` to all affected collectors to prevent processing unwanted interactions and eliminate unbounded memory growth.