<!--
===============================================================================
file_id: SOM-DOC-0001-v1.3.0
name: CLAUDE.md
description: Workspace standards and coding conventions for Claude Code
project_id: SOMACOSF-CORE
category: documentation
tags: [standards, conventions, workspace, claude-code, context-logging, failure-prevention]
created: 2025-01-19
modified: 2025-12-09
version: 1.3.0
agent:
  id: AGENT-PRIME-002
  name: agent_prime
  model: claude-opus-4-5-20251101
execution:
  type: context-file
  invocation: Auto-loaded by Claude Code in workspace
===============================================================================
-->

# Somacosf Workspace

Development workspace for multi-stack projects with Claude Code assistance.

## Workspace Structure

```
somacosf/
├── outputs/          # All project folders (LAN-shared as \\hostname\outputs)
├── scripts/          # Setup, utilities, maintenance scripts
├── templates/        # Project boilerplates
└── .claude/commands/ # Custom slash commands
```

## Environment

- **Platform**: Windows 10/11
- **PowerShell**: 7.0+
- **Python**: 3.12+
- **Package Manager**: uv (NEVER use pip directly)
- **File Search**: Everything CLI at `C:\Program Files\Everything\es.exe`

---

## MANDATORY Coding Standards

### 1. File Operations

**ALWAYS make a backup before editing any file:**
```powershell
# Before editing example.py:
Copy-Item example.py example.py.bk
```

**Version every file with a header comment** including:
- File name
- Version number (semver)
- Last modified date
- Brief description

### 2. Standard File Header (Catalog Schema)

All created/modified files MUST include this header format for catalog integration.

**For Markdown/documentation:**
```markdown
<!--
===============================================================================
file_id: SOM-XXX-NNNN-vX.X.X
name: filename.md
description: What this file does
project_id: PROJECT-TYPE
category: category_name
tags: [tag1, tag2, tag3]
created: YYYY-MM-DD
modified: YYYY-MM-DD
version: X.X.X
agent:
  id: AGENT-XXX-NNN
  name: agent_name
  model: model_id
execution:
  type: type_of_file
  invocation: how to use/run this file
===============================================================================
-->
```

**For Python:**
```python
# ==============================================================================
# file_id: SOM-SCR-NNNN-vX.X.X
# name: script.py
# description: What this script does
# project_id: PROJECT-TYPE
# category: script
# tags: [tag1, tag2]
# created: YYYY-MM-DD
# modified: YYYY-MM-DD
# version: X.X.X
# agent_id: AGENT-XXX-NNN
# execution: python script.py [args]
# ==============================================================================
```

**For PowerShell:**
```powershell
# ==============================================================================
# file_id: SOM-SCR-NNNN-vX.X.X
# name: script.ps1
# description: What this script does
# project_id: PROJECT-TYPE
# category: script
# tags: [tag1, tag2]
# created: YYYY-MM-DD
# modified: YYYY-MM-DD
# version: X.X.X
# agent_id: AGENT-XXX-NNN
# execution: .\script.ps1 [-Param value]
# ==============================================================================
```

**File ID Format:** `SOM-<CATEGORY>-<SEQUENCE>-v<VERSION>`

| Code | Category |
|------|----------|
| CMD | Slash commands |
| SCR | Scripts |
| DOC | Documentation |
| CFG | Configuration |
| REG | Registry files |
| TST | Tests |
| TMP | Templates |
| DTA | Data/schemas |
| LOG | Logs/diaries |

See `agent_registry.md` for complete ID system and file catalog.

### 3. Virtual Environments

**ALWAYS work inside a virtual environment.**

Create with uv:
```powershell
uv venv .venv
.venv\Scripts\activate.ps1
```

Install packages:
```powershell
uv pip install package-name
```

NEVER use bare `pip install`.

### 4. Command Chaining (Windows)

**ALWAYS use semicolons (;) for command chaining. NEVER use &&.**

```powershell
# CORRECT:
mkdir logs; cd logs; New-Item log.txt

# WRONG - DO NOT USE:
mkdir logs && cd logs && New-Item log.txt
```

### 5. Check Before Doing

**ALWAYS verify state before making changes:**

- Check if file exists before creating
- Check if directory exists before writing
- Check venv is activated before installing
- Check database schema before queries
- Read file content before editing

### 6. Logging

**All scripts must include proper logging:**

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/script_name.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)
```

Log files go in `<project>/logs/`.

### 7. Test-Driven Development

**Write tests first, then implementation:**

- Create `tests/` directory in each project
- Use pytest for Python projects
- Name test files `test_<module>.py`
- Run tests before committing

### 8. Development Diary

**Maintain `development_diary.md` in each project root:**

```markdown
# Development Diary

## 2025-01-19

### Session: [Brief description]
- **Agent**: Claude
- **Duration**: [time]
- **Tasks completed**:
  - Task 1
  - Task 2
- **Decisions made**:
  - Decision 1: Reasoning
- **Issues encountered**:
  - Issue and resolution
- **Next steps**:
  - Pending item 1
```

Update this diary at the start and end of each work session.

---

## Project Conventions

### New Projects

1. Create in `outputs/<project-name>/`
2. Initialize with:
   - `README.md` (project overview)
   - `development_diary.md`
   - `.venv/` (via uv)
   - `logs/`
   - `tests/`

### Database Projects

- Use SQLite for local databases
- Schema in `database/schema.sql`
- Include `diary_entries` table for operation logging

### Active Projects

- **somaco_clean**: File discovery/deduplication TUI (PowerShell + Python)

---

## Path Patterns to Exclude

When searching or processing, always exclude:
- `**/node_modules/**`
- `**/.git/**`
- `**/.venv/**`, `**/venv/**`, `**/cleanup_env/lib/**`
- `**/__pycache__/**`
- `**/*.bk` (backup files)

---

## Quick Reference

| Task | Command |
|------|---------|
| Create venv | `uv venv .venv` |
| Activate venv | `.venv\Scripts\activate.ps1` |
| Install package | `uv pip install <pkg>` |
| Run tests | `pytest tests/` |
| Chain commands | `cmd1; cmd2; cmd3` |

---

## Remember

1. Backup before edit (.bk)
2. Headers on all files
3. Work in venv
4. Use uv, not pip
5. Log everything
6. Test first
7. Update diary
8. Check then do
9. **LOG CONTEXT TO DATABASE** (see below)
10. **Register agent session on start**
11. **GROUND BEFORE ACTION** - verify schema/file/API before operating
12. **NEVER SUBSTITUTE** - if missing, return 0/null or ASK

---

## MANDATORY: Agent Context Logging

**CRITICAL**: All agents MUST log their activity to SQLite databases for crash recovery and session continuity. This is NON-NEGOTIABLE.

### Context Databases

Located in: `<project>/database/context/`

| Database | Purpose |
|----------|---------|
| `agent_context.db` | Agent registry, activity windows, action log, context snapshots |
| `project_tasks.db` | Task management (CRUD, soft-delete only, full history) |

### Agent Session Protocol

**On Session Start (MANDATORY):**

1. **Register/Update Agent in Database**
   ```sql
   -- In agent_context.db
   INSERT OR REPLACE INTO agents (id, name, model, role, last_active_at, status)
   VALUES ('AGENT-XXX-NNN', 'agent_name', 'model_id', 'role description', datetime('now'), 'active');
   ```

2. **Create Activity Window**
   ```sql
   INSERT INTO activity_windows (agent_id, session_summary, status)
   VALUES ('AGENT-XXX-NNN', 'Brief description of planned work', 'active');
   -- Store the returned window_id for logging actions
   ```

3. **Check for Interrupted Sessions**
   ```sql
   SELECT * FROM activity_windows WHERE agent_id = 'AGENT-XXX-NNN' AND status = 'active';
   -- If found, review context_snapshots and action_log to resume
   ```

### Action Logging (During Session)

**Log Every Significant Action:**

```sql
INSERT INTO action_log (window_id, agent_id, action_type, action_summary, target, result, context)
VALUES (
    <window_id>,
    'AGENT-XXX-NNN',
    'read_file',           -- action_type: read_file, edit_file, bash_command, search, decision, thought, error
    'Read CLAUDE.md to understand workspace standards',  -- action_summary
    'D:\somacosf\CLAUDE.md',  -- target
    'success',             -- result: success, failure, partial
    '{"reasoning": "Needed to understand file header format"}'  -- context (JSON)
);
```

**Action Types:**
| Type | When to Log |
|------|-------------|
| `read_file` | After reading any file |
| `edit_file` | After modifying any file |
| `bash_command` | After executing shell commands |
| `search` | After glob/grep searches |
| `decision` | When making architectural or design decisions |
| `thought` | Important reasoning or analysis |
| `error` | When encountering errors or blockers |

### Context Snapshots (Every 10-15 Actions or Major Milestone)

```sql
INSERT INTO context_snapshots (window_id, agent_id, current_task, pending_items, files_modified, decisions_made, blockers, next_steps)
VALUES (
    <window_id>,
    'AGENT-XXX-NNN',
    'Current task description',
    '["item1", "item2"]',           -- JSON array
    '["file1.py", "file2.ts"]',     -- JSON array
    '["Used X instead of Y because..."]',  -- JSON array
    '["Waiting on user input for..."]',    -- JSON array
    '["Next: implement Z", "Then: test"]'  -- JSON array
);
```

### Session End Protocol

**On Session End or Before Terminal Close:**

```sql
UPDATE activity_windows
SET ended_at = datetime('now'),
    status = 'completed',
    session_summary = 'Final summary of work done'
WHERE id = <window_id>;
```

### Crash Recovery

When starting a new session, ALWAYS check for interrupted sessions:

```sql
-- Find unfinished sessions for this agent
SELECT aw.*,
       (SELECT COUNT(*) FROM action_log WHERE window_id = aw.id) as action_count
FROM activity_windows aw
WHERE aw.agent_id LIKE 'AGENT-%'
  AND aw.status = 'active'
ORDER BY aw.started_at DESC;

-- Get last context snapshot
SELECT * FROM context_snapshots
WHERE window_id = <interrupted_window_id>
ORDER BY timestamp DESC LIMIT 1;

-- Get recent actions
SELECT * FROM action_log
WHERE window_id = <interrupted_window_id>
ORDER BY timestamp DESC LIMIT 20;
```

### Task Management Protocol

Agents interact with `project_tasks.db` for coordinated work:

**Check Out a Task:**
```sql
UPDATE tasks SET
    checked_out_at = datetime('now'),
    checked_out_by = 'AGENT-XXX-NNN',
    status = 'in_progress',
    updated_at = datetime('now'),
    updated_by = 'AGENT-XXX-NNN'
WHERE id = <task_id> AND checked_out_by IS NULL;
```

**Create a Task:**
```sql
INSERT INTO tasks (project_id, title, description, priority, created_by)
VALUES ('AEGIS', 'Task title', 'Description', 'high', 'AGENT-XXX-NNN');
```

**Complete a Task:**
```sql
UPDATE tasks SET
    status = 'completed',
    completed_at = datetime('now'),
    completed_by = 'AGENT-XXX-NNN',
    checked_out_by = NULL,
    updated_at = datetime('now'),
    updated_by = 'AGENT-XXX-NNN'
WHERE id = <task_id>;
```

**NEVER Delete Tasks** - Use soft delete:
```sql
UPDATE tasks SET
    is_deleted = 1,
    deleted_at = datetime('now'),
    deleted_by = 'AGENT-XXX-NNN'
WHERE id = <task_id>;
```

### Multi-Agent Coordination

Use `handoffs` table for agent communication:

```sql
-- Send handoff message
INSERT INTO handoffs (from_agent, to_agent, message_type, message)
VALUES (
    'AGENT-PRIME-002',
    'AGENT-WORKER-001',  -- NULL for broadcast
    'task_delegation',   -- status_update, task_delegation, error_report, context_share
    'Please complete the API integration task'
);

-- Check for messages
SELECT * FROM handoffs
WHERE (to_agent = 'AGENT-XXX-NNN' OR to_agent IS NULL)
  AND acknowledged_at IS NULL
ORDER BY timestamp;
```

### Quick Reference: Required Logging

| Event | Action Required |
|-------|-----------------|
| Session start | Register agent, create activity_window |
| Read file | Log to action_log (type: read_file) |
| Edit file | Log to action_log (type: edit_file) |
| Run command | Log to action_log (type: bash_command) |
| Key decision | Log to action_log (type: decision) |
| Error/blocker | Log to action_log (type: error) |
| Every 10-15 actions | Create context_snapshot |
| Session end | Update activity_window status |

### Database Locations

```
<project>/database/context/
├── agent_context.db    # Agent sessions and activity
├── project_tasks.db    # Task management
├── schema.sql          # Context DB schema
├── tasks_schema.sql    # Tasks DB schema
└── init_context_db.py  # Initialization script
```

Initialize with:
```bash
cd <project>/database/context
python init_context_db.py        # Create if not exists
python init_context_db.py --reset  # Reset all tables
```

---

## MANDATORY: Failure-Aware Agent Behavior

**Based on research: "How Do LLMs Fail In Agentic Scenarios?" (Kamiwaza AI, 2025)**

> **"Recovery capability, not initial correctness, best predicts overall success."**

Agents MUST follow these protocols to prevent the four identified failure archetypes.

### The Four Failure Archetypes

| Archetype | Description | Prevention |
|-----------|-------------|------------|
| **Premature Action** | Acting on assumptions instead of verifying | ALWAYS inspect before acting |
| **Over-Helpfulness** | Substituting/inventing when data is missing | Return 0/null, ASK user |
| **Context Pollution** | Errors from distractor information | Exact name matching, curate context |
| **Fragile Execution** | Generation loops, coherence loss under load | Checkpoint every 3 actions |

### Grounding Protocol (MANDATORY)

**BEFORE any critical action, perform a grounding check:**

```sql
-- Log grounding check to failure_tracking tables
INSERT INTO grounding_checks (window_id, agent_id, intended_action, action_category, target, verification_type, verification_result, proceed_decision, reasoning)
VALUES (
    <window_id>,
    'AGENT-XXX-NNN',
    'Write SQL query for orders table',
    'db_query',
    'orders',
    'schema_check',
    '{"tables": ["enterprise_orders", "enterprise_customers"], "columns": [...]}',
    'modify',  -- proceed, abort, modify
    'Table name is enterprise_orders, not orders'
);
```

**Grounding Requirements by Action Type:**

| Action Category | REQUIRED Verification |
|-----------------|----------------------|
| `db_query` | `sqlite_get_schema` or `PRAGMA table_info()` |
| `file_edit` | Read file first, understand structure |
| `api_call` | Check documentation or test endpoint |
| `schema_change` | Backup AND read existing schema |

**NEVER:**
- Guess table/column names
- Assume file structure
- Execute queries without schema verification

### Over-Helpfulness Prevention

When facing missing or ambiguous data:

```
WRONG: "Company X not found, using Company XYZ instead"
RIGHT: "Company X not found. 0 results returned."

WRONG: "Status 'inactive' not found, using STATUS != 'active'"
RIGHT: "Status value 'inactive' does not exist. Available values: active, pending, closed"

WRONG: Create a file that doesn't exist when asked to edit it
RIGHT: "File not found at path. Should I create it?"
```

**Rule: If uncertain, ASK - do not substitute or invent.**

### Context Pollution Prevention

The "Chekhov's Gun" effect: LLMs treat ALL context as signal, not noise.

**Prevention Checklist:**
- [ ] Verify entity names match EXACTLY (similar names are distractors)
- [ ] At each step, re-verify operating on correct target
- [ ] When reading files, note similar-named entities that could confuse
- [ ] Curate context aggressively - more is NOT better

**Log context markers when reading files:**
```sql
INSERT INTO context_markers (window_id, agent_id, marker_type, source, distractor_risk, contains_similar_names)
VALUES (
    <window_id>,
    'AGENT-XXX-NNN',
    'file_content',
    'src/models/user.ts',
    'medium',  -- none, low, medium, high
    1  -- Contains UserProfile, UserAccount, UserSettings - potential confusion
);
```

### Fragile Execution Prevention

**Triggers to Watch:**
1. **Data Inlining**: NEVER embed large CSV/text in code - use file I/O
2. **Extended Error Recovery**: >3 consecutive failures = STOP and reassess
3. **Generation Loops**: Repeated similar output = coherence degrading

**Mandatory Checkpoints:**
- Every 3 actions for complex tasks (>5 steps)
- Every 20 actions regardless of task complexity
- After any error recovery attempt

```sql
-- Create checkpoint snapshot
INSERT INTO context_snapshots (window_id, agent_id, current_task, pending_items, next_steps)
VALUES (<window_id>, 'AGENT-XXX-NNN', 'Checkpoint: task progress', '[...]', '[...]');
```

### Failure Logging

**When a failure occurs:**

```sql
INSERT INTO failure_incidents (window_id, agent_id, archetype, severity, error_description, expected_outcome, actual_outcome, grounding_bypassed)
VALUES (
    <window_id>,
    'AGENT-XXX-NNN',
    'PREMATURE_ACTION',  -- PREMATURE_ACTION, OVER_HELPFUL, CONTEXT_POLLUTION, FRAGILE_EXECUTION
    'medium',            -- critical, high, medium, low
    'Queried non-existent table "orders"',
    'Data from orders table',
    'SQL error: no such table',
    1  -- Did we skip grounding check?
);
```

### Recovery Protocol

**Recovery is the key differentiator.** When errors occur:

1. **Diagnose Root Cause** - Don't just retry blindly
2. **Inspect/Verify** - Go back to grounding (schema, file content, etc.)
3. **Correct Approach** - Fix the actual issue
4. **Validate Result** - Confirm the fix worked

```sql
-- Log recovery attempt
INSERT INTO recovery_attempts (failure_id, window_id, agent_id, attempt_number, strategy, outcome, lesson_learned)
VALUES (
    <failure_id>,
    <window_id>,
    'AGENT-XXX-NNN',
    1,
    'reread',  -- retry, backtrack, reread, ask_user, alternative_approach
    'success', -- success, partial, failed
    'Always check schema before SQL queries'
);
```

**NEVER:** Repeat the same failed action more than twice without changing approach.

### Quick Reference: Failure Prevention

| Before... | ALWAYS... |
|-----------|-----------|
| SQL query | `PRAGMA table_info()` or schema read |
| File edit | Read file content first |
| API call | Check docs or test endpoint |
| Using entity name | Verify EXACT match |
| Complex task | Create checkpoint every 3 actions |

| When... | DO... |
|---------|-------|
| Entity not found | Return 0/null, report missing |
| Ambiguous request | ASK for clarification |
| >3 consecutive errors | STOP, reassess approach |
| Similar names in context | Flag as high distractor risk |

### Database Extensions

Failure tracking tables in `agent_context.db`:
- `grounding_checks` - Pre-action verification records
- `failure_incidents` - Classified failures by archetype
- `recovery_attempts` - Recovery strategy and outcomes
- `context_markers` - Context pollution risk tracking
- `prevention_checklist` - Learned prevention measures

See `failure_tracking_schema.sql` for full schema.
See `failure_models.md` for detailed archetype documentation with diagrams.
