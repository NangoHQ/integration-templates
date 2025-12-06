---
description: Complete workflow for building Nango actions - discovers connections, generates actions, creates tests, and validates
argument-hint: [integration-name] [action-name] [instructions]
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Skill, Task, AskUserQuestion
---

# Build Actions Workflow

## Mode Detection

**If $1 is empty:** Interactive mode - we'll prompt you for all required information
**If $1 is provided:** Direct mode - using provided arguments

Integration: **$1**
Action: **$2** (optional - if not provided, will guide you through discovery)
Instructions: **$3** (optional - explicit guidance for implementation)

## Interactive Mode (when no arguments provided)

**Step 1: Gather All Required Information**

Ask the user directly (not using AskUserQuestion tool):

"Please provide the following information:

**Integration ID** (required): Which integration? (e.g., hubspot, salesforce, slack)

**Connection ID** (optional): Do you have a connection ID for testing? If not, I'll auto-discover one.

**Action Details** (optional but recommended - the more detailed, the better the output):
- **Use Case Summary** - Brief description of what the action does
- **Action Inputs** - What data the action should take as arguments
- **Action Outputs** - What data the action should return
- **Optional Action Name** - Suggested name for the action
- **Optional API Reference** - Link to relevant API documentation
- **Optional Test Input** - Sample JSON input to use for testing the action

Example format:
```
Integration ID: hubspot
Connection ID: my-hubspot-connection (or leave blank to auto-discover)
Use Case: Creates a new contact in the CRM
Inputs: firstName, lastName, email
Outputs: contactId, createdAt
Action Name: create-contact
API Reference: https://developers.example.com/api/contacts
Test Input: {"firstName": "John", "lastName": "Doe", "email": "john.doe@example.com"}
```

Please provide all information in a single response."

Wait for their response. Parse and store:
- Integration ID as integrationId
- Connection ID (if provided) - skip Connection Discovery step if provided
- Action details as detailed instructions for implementation
- Test Input (if provided) for use in creating input.json mock file

---

## Standard Workflow (for both modes)

**IMPORTANT: Loading nango-action-builder skill for implementation pattern...**

Use the Skill tool to load `nango-action-builder` skill NOW.

## Step 0: Save Original Prompt

**REQUIRED:** Before starting implementation, save the original prompt/instructions.

Create directory: `nango-integrations/{integrationId}/.prompts/`

Save the prompt to: `nango-integrations/{integrationId}/.prompts/<action-name>.txt`

**Content to save:**
- If using direct mode with $3: Save the value of $3
- If using interactive mode: Save the full action details gathered in Step 2
- If no instructions provided: Save "No specific instructions provided"

**Example:**
```bash
mkdir -p nango-integrations/{integrationId}/.prompts
# Write prompt content to file
```

This preserves the original requirements and helps with:
- Documentation
- Future modifications
- Understanding design decisions
- Training data / improvements

## Working Directory

**🚨 CRITICAL: All commands must be run from `nango-integrations/` directory**

Before executing any commands:
```bash
cd nango-integrations/
```

This includes: `npm`, `npx nango`, test commands, etc.

## TDD Workflow

1. **Discovery** - Find valid connection
2. **Planning** - Define actions to build
3. **Schema** - Define Zod input/output schemas (using nango-action-builder pattern)
4. **RED** - Write failing test
5. **GREEN** - Implement action (using nango-action-builder pattern)
6. **Validation** - Run dryrun with real API (MANDATORY for EVERY action)
7. **Cleanup** - Remove test data and old mocks
8. **Iterate** - Repeat

**CRITICAL: Run dryrun validation for EACH action. Unit tests alone are insufficient.**

## Step 1: Connection Discovery

**Note:** If you already gathered a connection ID in interactive mode, skip this step.

Using connection-discoverer agent to find connections for the integration (either from $1 or from interactive mode)...

## Step 2: Action Planning

### Auto-Discovery (Recommended)

Say "discover" and I'll:
1. Find provider API docs
2. Check competitors (Composio, Merge.dev)
3. Suggest prioritized actions
4. Let you select which to build

### Manual Planning

Specify actions directly:
```
Build: create-note, update-note, delete-note
API docs: https://developers.example.com/api/notes
```

## Step 3: Implement Action

Use the `nango-action-builder` skill (already loaded) for:
- Complete action implementation pattern
- Schema definitions
- Common mistakes to avoid
- Full checklist

**If instructions provided ($3):**
- Use instructions as PRIMARY guide for input/output schemas
- Parse required fields and types from instructions
- Reference API docs as SECONDARY source for technical details

**The skill is the single source of truth for implementation details.**

## Step 4: TDD Loop

### Create Mock Files First

Before writing tests, create mock files:

1. **Create input mock**: `nango-integrations/{integrationId}/mocks/<action-name>/input.json`
2. **Create output mock**: `nango-integrations/{integrationId}/mocks/<action-name>/output.json`

**If test input was provided in interactive mode or arguments, use it for input.json. Otherwise, create a sample input.**

Example input.json:
```json
{
  "body": "Test note"
}
```

Example output.json:
```json
{
  "id": "123456789",
  "body": "Test note",
  "created_date": "2025-01-01T10:00:00.000Z"
}
```

### RED - Generate Failing Test

**CRITICAL: Use `npx nango generate:tests` to create tests automatically.**

```bash
npx nango generate:tests
```

**VERIFY the test file was created:**
```bash
ls -la {integrationId}/tests/{integrationId}-<action-name>.test.ts
```

Expected location: `nango-integrations/{integrationId}/tests/{integrationId}-<action-name>.test.ts`

(Where {integrationId} is either $1 from arguments or the value gathered in interactive mode)

**If the test file was NOT created:**
- Ensure you're in the nango-integrations/ directory
- Check that mock files exist (input.json, output.json)
- Verify the action file exists in {integrationId}/actions/<action-name>.ts
- Run `npx nango compile` to check for syntax errors

The generated test will use Nango's testing utilities and your mock files.

❌ **DON'T manually write test files** - Always use the CLI to generate them.
❌ **DON'T skip verification** - Confirm the file exists before proceeding.

### GREEN - Implement Action

File: `nango-integrations/{integrationId}/actions/<action-name>.ts`

(Where {integrationId} is either $1 from arguments or the value gathered in interactive mode)

**File header template:**
```typescript
/**
 * Instructions: $3 or [from interactive mode action details]
 *
 * API Docs: [URL from discovery or interactive mode]
 */
```

Note:
- Use instructions from $3 if provided via arguments
- Use action details gathered in interactive mode if no arguments
- Omit the Instructions line if neither is provided

**Comments:**
- ✅ Instructions at top (if provided)
- ✅ API docs link
- ✅ Complex business logic
- ❌ Obvious operations

After implementing, compile to verify TypeScript correctness:
```bash
npx nango compile
```

### Validation - Dryrun (MANDATORY)

**🚨 CRITICAL: Run dryrun for EVERY action against real API.**

```bash
npx nango dryrun <action-name> <connection-id> --input '{"field":"value"}' --integration-id {integrationId}
```

(Where {integrationId} is either $1 from arguments or the value gathered in interactive mode)

**If test input was provided in interactive mode, use it for the --input flag. Otherwise, construct appropriate test input.**

Example:
```bash
npx nango dryrun get-contact <conn-id> --input '{"id":"123"}' --integration-id hubspot
```

**What dryrun validates:**
- ✅ TypeScript compilation succeeds
- ✅ HTTP request to real API succeeds
- ✅ **Return value matches output schema** (Zod validation)
- ✅ All required fields present
- ✅ Field types match schema definitions

**Useful flags:**
```bash
# Show detailed validation errors
npx nango dryrun <action-name> <conn-id> --input '{...}' --validation --integration-id {integrationId}

# Auto-save API response as mock
npx nango dryrun <action-name> <conn-id> --input '{...}' --save-responses --integration-id {integrationId}
```

**CRUD workflow:**
1. Create → capture ID
2. Get → verify fields
3. Update → verify changes
4. Delete → cleanup

**After successful dryrun:**

Output the complete dryrun command for easy re-testing:
```bash
npx nango dryrun <action-name> <connection-id> --input '{"field":"value"}' --integration-id {integrationId}
```

This allows the user to quickly re-test the action without reconstructing the command.

### Cleanup

**Test Resource Cleanup:**

| Action Type | Cleanup |
|-------------|---------|
| create/update/delete/get | Delete test resource |
| list | No cleanup needed |

**Mock File Cleanup (CRITICAL):**

**When changing endpoints or implementation approach, you MUST clean up old/unused mocks:**

1. **If you change the API endpoint** - Delete old mock files from previous endpoint
2. **If you change input/output schemas** - Delete old input.json/output.json and API response mocks
3. **If you abandon an approach** - Remove all associated mock files

**Example cleanup scenarios:**

```bash
# Scenario 1: Changed from POST /notes to POST /crm/notes
# Clean up old endpoint mocks
rm -rf nango-integrations/{integrationId}/mocks/nango/post/proxy/notes/

# Scenario 2: Changed action implementation completely
# Clean up all old mocks for this action
rm -rf nango-integrations/{integrationId}/mocks/<action-name>/
rm -rf nango-integrations/{integrationId}/mocks/nango/*/proxy/*/<action-name>/

# Scenario 3: Changed input schema
# Regenerate input.json with new schema
rm nango-integrations/{integrationId}/mocks/<action-name>/input.json
# Create new input.json with updated fields
```

**Why this matters:**
- ❌ Old mocks can cause tests to pass with wrong data
- ❌ Confusing to have multiple mock sets for same action
- ❌ Wastes disk space and pollutes codebase
- ✅ Clean mocks = accurate tests = confidence in implementation

### Mock Files (MANDATORY)

**⚠️ BEFORE creating new mocks: Check for and delete any old/unused mocks from previous attempts or different endpoints. See "Mock File Cleanup" section above.**

**WORKFLOW: Always create mocks in this order:**

1. **Create input/output mocks manually** (simple format):
```bash
mkdir -p nango-integrations/{integrationId}/mocks/<action-name>
# Create nango-integrations/{integrationId}/mocks/<action-name>/input.json
# Create nango-integrations/{integrationId}/mocks/<action-name>/output.json
```

2. **Run dryrun with `--save-responses` to auto-generate API response mocks:**
```bash
npx nango dryrun <action-name> <conn-id> --input '{...}' --save-responses --integration-id {integrationId}
```

This automatically:
- Saves full API response with correct structure (method, endpoint, requestIdentity, response, status, headers)
- Creates hash-based subdirectories
- Uses actual parameter values in paths

**🚨 CRITICAL: If you run `--save-responses` again after changing the action:**
- Delete the previous mock files FIRST
- Otherwise you'll have stale mocks that don't match the current implementation
- Example: `rm -rf nango-integrations/{integrationId}/mocks/nango/*/proxy/*/<action-name>/`
- Then run `--save-responses` again to generate fresh mocks

3. **Copy the generated mock for test compatibility:**
The dryrun creates a mock with hash based on headers like `Nango-Is-Script`. Tests run without those headers and generate different hashes. You need to:
- Find the generated mock file
- Copy it with the hash the test expects
- The test error message will show the expected hash

**Mock Structure Requirements:**
```json
{
  "method": "post",
  "endpoint": "api/v1/resource",
  "requestIdentityHash": "abc123...",
  "requestIdentity": {
    "method": "post",
    "endpoint": "api/v1/resource",
    "params": [],
    "headers": [],
    "data": "{...}"
  },
  "response": { /* actual API response */ },
  "status": 200,
  "headers": { /* response headers */ }
}
```

**Directory Structure:**
```
{integrationId}/mocks/
├── <action-name>/
│   ├── input.json           # Simple input
│   └── output.json          # Expected output
└── nango/<method>/proxy/<path>/<action-name>/
    ├── <dryrun-hash>.json   # From --save-responses
    └── <test-hash>.json     # Copy for tests (if different)
```

**⚠️ Common Mistakes:**
- ❌ Creating API response mocks manually (always use `--save-responses`)
- ❌ Using simplified response format (must include full structure)
- ❌ Forgetting to copy mock with test hash
- ❌ **Running `--save-responses` again without deleting old mocks (creates stale mocks)**
- ✅ Always run dryrun with `--save-responses` first
- ✅ **Delete old mocks before running `--save-responses` again**
- ✅ Copy generated mock if test hash differs

## Step 5: Validation Checklist

**Per action:**
- [ ] Original prompt saved to `.prompts/<action-name>.txt`
- [ ] **Old/unused mocks cleaned up** (if changing endpoint or implementation)
- [ ] Mock files created (input.json, output.json)
- [ ] Test generated using `npx nango generate:tests` AND verified file exists
- [ ] Action implemented (GREEN)
- [ ] **Action imported in `index.ts`** (e.g., `import './provider/actions/action-name.js';`)
- [ ] Compilation passes (`npx nango compile`)
- [ ] Dryrun passes with real API
- [ ] Dryrun command outputted for user re-testing
- [ ] Cleanup runs (test resources AND old mocks if applicable)

**⚠️ Run dryrun for EACH action individually.**

## Common Workflow Mistakes

| Mistake | Why It Fails | Fix |
|---------|--------------|-----|
| Running commands from wrong directory | Commands fail or can't find files | Always `cd nango-integrations/` first |
| Forgetting to update index.ts | Action won't be loaded/compiled | Add import to index.ts after creating action file |
| Not cleaning up old mocks | Tests pass with stale/incorrect data | Delete old mocks before running `--save-responses` again |
| Manually writing test files | Wrong structure, missing test utilities | Use `npx nango generate:tests` |
| Skipping dryrun validation | Action may fail in production | Always run dryrun with real API for each action |
| Not verifying test file creation | Tests not generated, workflow blocked | Check file exists after `generate:tests` |
| Looking for nango.yaml | File doesn't exist in this setup | Use index.ts for imports instead |

## 🚨 CRITICAL: AI Cannot Edit Generated Actions

**Once a `createAction()` TypeScript file is generated, the AI CANNOT modify it.**

This applies to:
- The action file itself (`{integration}/actions/{action-name}.ts`)
- Zod schema definitions
- Endpoint configurations
- Transformation logic in `exec` function
- Any other part of the generated action

**The AI can only:**
- Generate the initial action file
- Run validation commands (compile, dryrun, tests)
- Report results to the user

**The AI CANNOT:**
- "Fix" or "improve" generated code
- Refactor schemas or transformations
- Change API endpoints or parameters
- Add "missing" fields or features

**Why this rule exists:**
1. Generated actions are **output artifacts** - they represent the completed work
2. AI "improvements" can introduce inconsistencies or deviate from requirements
3. Changes must be **intentional human decisions**, not AI auto-corrections
4. This maintains **reproducibility** - same inputs = same outputs

**If changes are needed after generation:**
1. User must manually edit the file, OR
2. User must explicitly request complete regeneration with new requirements
3. User may ask AI to suggest changes, but AI cannot implement them directly

## Helpful Commands

```bash
npx nango compile
```

## Usage

**Auto-discover (recommended):**
```
"discover" → I find docs, analyze competitors, suggest actions
```

**Manual mode:**
```
Build: create-note, update-note
API docs: https://developers.example.com/api
```
