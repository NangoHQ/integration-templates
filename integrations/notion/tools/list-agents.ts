import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        limit: z.number().int().min(1).max(100).optional().describe('Maximum agents in this page.'),
        match: z
            .enum(['all', 'any'])
            .optional()
            .describe('Combine supplied property filters with AND or OR; query remains a separate name/description constraint.'),
        query: z.string().optional().describe('Case-insensitive substring of agent names or descriptions; omit for enumeration.'),
        sorts: z
            .array(
                z
                    .object({
                        field: z.enum(['createdAt', 'lastRunAt']).describe('Instant used to order agents.'),
                        direction: z.enum(['ascending', 'descending']).describe('Order direction.')
                    })
                    .describe('One sort key; earlier entries take precedence.')
            )
            .min(1)
            .max(2)
            .optional()
            .describe('Ordered sort precedence; omission uses creation descending.'),
        cursor: z.string().min(1).optional().describe('Opaque continuation scoped to this connection and unchanged query options.'),
        agentId: z.string().min(1).optional().describe('Optional exact agent ID filter.'),
        statuses: z
            .array(z.enum(['active', 'disabled', 'deleted']))
            .min(1)
            .meta({ uniqueItems: true })
            .optional()
            .describe('Allowed lifecycle states, ORed within this filter.'),
        agentType: z.enum(['notion_ai', 'custom_agent', 'autofill_custom_agent']).optional().describe('Optional agent kind filter.'),
        favorited: z.boolean().optional().describe('Filter by personal favorite state; omit to include both.'),
        mcpServer: z.string().optional().describe('Provider MCP server connection filter value.'),
        modelMode: z.enum(['auto', 'pinned']).optional().describe('Optional automatic or pinned model filter.'),
        createdById: z.string().min(1).optional().describe('Creator user or bot ID filter.'),
        agentVersion: z.number().int().min(1).optional().describe('Optional exact published version number.'),
        createdAfter: z.string().meta({ format: 'date-time' }).optional().describe('Exclusive lower creation instant with explicit offset.'),
        lastRunAfter: z.string().meta({ format: 'date-time' }).optional().describe('Exclusive lower last-run instant with explicit offset.'),
        createdBefore: z.string().meta({ format: 'date-time' }).optional().describe('Exclusive upper creation instant with explicit offset.'),
        lastRunBefore: z.string().meta({ format: 'date-time' }).optional().describe('Exclusive upper last-run instant with explicit offset.'),
        includeDeleted: z.boolean().optional().describe('Include soft-deleted agents in the eligible collection.')
    })
    .describe('Filter, sort, and pagination options for one page of agents.');

const AgentSummarySchema = z
    .object({
        id: z.string().describe('Agent identifier for get-agent and administration.'),
        name: z.string().describe('Agent display name.'),
        status: z.enum(['active', 'disabled', 'deleted']).describe('Agent lifecycle state.'),
        agentType: z.string().describe('Provider agent kind.'),
        createdAt: z.string().meta({ format: 'date-time' }).nullable().describe('Creation instant in UTC, or null where inapplicable.'),
        lastRunAt: z
            .union([z.string().meta({ format: 'date-time' }), z.null(), z.literal('hidden')])
            .describe('Last run in UTC, null if never run, or hidden.'),
        updatedAt: z.string().meta({ format: 'date-time' }).nullable().describe('Last edit instant in UTC, or null where inapplicable.'),
        creditLimit: z.union([z.number().int(), z.null(), z.literal('hidden')]).describe('Effective credit limit; null is uncapped, hidden is restricted.'),
        description: z.string().nullable().describe('Agent description, or null.'),
        pauseReason: z.string().nullable().describe('Provider pause reason, or null.')
    })
    .describe('Summary of one agent.');

const OutputSchema = z
    .object({
        items: z.array(AgentSummarySchema).describe('Agent summaries in the requested order.'),
        nextCursor: z.string().optional().describe('Continuation for the same query; absent when exhausted.')
    })
    .describe('One page of agent summaries and the cursor for the next page.');

const ProviderAgentSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    agent_type: z.string(),
    status: z.enum(['active', 'disabled', 'deleted']),
    pause_reason: z.string().nullable(),
    credit_limit: z.union([z.number().int(), z.literal('hidden'), z.null()]),
    created_time: z.string().nullable(),
    last_edited_time: z.string().nullable(),
    last_run_at: z.union([z.literal('hidden'), z.string(), z.null()])
});

const ProviderQueryResponseSchema = z.object({
    results: z.array(ProviderAgentSchema),
    has_more: z.boolean(),
    next_cursor: z.string().nullable()
});

const HttpErrorSchema = z.object({
    response: z.object({
        status: z.number(),
        headers: z.unknown().optional(),
        data: z.unknown().optional()
    })
});

const ProviderErrorBodySchema = z.object({
    code: z.string().optional(),
    message: z.string().optional()
});

const RetryAfterHeaderSchema = z.object({
    'retry-after': z.string().optional()
});

interface AgentQueryDateRange {
    after?: string;
    before?: string;
}

type AgentQueryFilterLeaf =
    | { property: 'id'; id: { equals: string } }
    | { property: 'agent_type'; string: { equals: 'notion_ai' | 'custom_agent' | 'autofill_custom_agent' } }
    | { property: 'created_by'; people: { contains: string } }
    | { property: 'created_time'; date: AgentQueryDateRange }
    | { property: 'last_run_at'; date: AgentQueryDateRange }
    | { property: 'favorited'; checkbox: { equals: boolean } }
    | { property: 'connections'; mcp_server: { contains: string } }
    | { property: 'status'; status: { in: ('active' | 'disabled' | 'deleted')[] } }
    | { property: 'model_mode'; select: { equals: 'auto' | 'pinned' } }
    | { property: 'agent_version'; number: { equals: number } };

type AgentQueryFilter = AgentQueryFilterLeaf | { and: AgentQueryFilterLeaf[] } | { or: AgentQueryFilterLeaf[] };

interface AgentQuerySort {
    property: 'created_time' | 'last_run_at';
    direction: 'ascending' | 'descending';
}

interface AgentQueryRequestBody {
    query?: string;
    filter?: AgentQueryFilter;
    sorts?: AgentQuerySort[];
    verbose: boolean;
    page_size: number;
    start_cursor?: string;
    include_deleted: boolean;
}

const SORT_PROPERTY_MAP: Record<'createdAt' | 'lastRunAt', 'created_time' | 'last_run_at'> = {
    createdAt: 'created_time',
    lastRunAt: 'last_run_at'
};

const INSTANT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

interface ParsedInstant {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    fraction: string;
    offsetMinutes: number;
}

function parseInstant(value: string): ParsedInstant {
    const match = INSTANT_PATTERN.exec(value);
    if (!match) {
        throw new Error(`Cannot normalize timestamp '${value}' to UTC.`);
    }
    const [, year, month, day, hour, minute, second, fraction, zone] = match;
    if (
        year === undefined ||
        month === undefined ||
        day === undefined ||
        hour === undefined ||
        minute === undefined ||
        second === undefined ||
        zone === undefined
    ) {
        throw new Error(`Cannot normalize timestamp '${value}' to UTC.`);
    }
    const sign = zone.startsWith('-') ? -1 : 1;
    const offsetMinutes = zone === 'Z' ? 0 : sign * (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(4, 6)));
    return {
        year: Number(year),
        month: Number(month),
        day: Number(day),
        hour: Number(hour),
        minute: Number(minute),
        second: Number(second),
        fraction: fraction ?? '',
        offsetMinutes
    };
}

function epochMsOf(instant: ParsedInstant): number {
    const date = new Date(Date.UTC(instant.year, instant.month - 1, instant.day, instant.hour, instant.minute, instant.second));
    date.setUTCFullYear(instant.year);
    return date.getTime() - instant.offsetMinutes * 60000;
}

function toUtcInstant(value: string): string {
    if (value.endsWith('Z')) {
        return value;
    }
    const instant = parseInstant(value);
    const shifted = new Date(epochMsOf(instant));
    const pad2 = (n: number): string => String(n).padStart(2, '0');
    const year = String(shifted.getUTCFullYear()).padStart(4, '0');
    return `${year}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}T${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}:${pad2(shifted.getUTCSeconds())}${instant.fraction}Z`;
}

function compareInstants(a: string, b: string): number {
    const left = parseInstant(a);
    const right = parseInstant(b);
    const leftMs = epochMsOf(left);
    const rightMs = epochMsOf(right);
    if (leftMs !== rightMs) {
        return leftMs < rightMs ? -1 : 1;
    }
    const leftFraction = left.fraction.slice(1);
    const rightFraction = right.fraction.slice(1);
    const length = Math.max(leftFraction.length, rightFraction.length);
    const leftPadded = leftFraction.padEnd(length, '0');
    const rightPadded = rightFraction.padEnd(length, '0');
    if (leftPadded === rightPadded) {
        return 0;
    }
    return leftPadded < rightPadded ? -1 : 1;
}

function buildDateRange(after: string | undefined, before: string | undefined): AgentQueryDateRange | undefined {
    if (after === undefined && before === undefined) {
        return undefined;
    }
    return {
        ...(after !== undefined && { after: toUtcInstant(after) }),
        ...(before !== undefined && { before: toUtcInstant(before) })
    };
}

function asError(err: unknown): Error {
    return err instanceof Error ? err : new Error(String(err));
}

function mapProviderError(err: unknown): Error {
    const parsed = HttpErrorSchema.safeParse(err);
    if (!parsed.success) {
        return asError(err);
    }
    const { status, headers, data } = parsed.data.response;
    const body = ProviderErrorBodySchema.safeParse(data);
    const detail = body.success && body.data.message !== undefined && body.data.message !== '' ? ` ${body.data.message}` : '';
    switch (status) {
        case 400:
            return new Error(`invalid_request: Notion rejected the query filters or continuation cursor.${detail}`);
        case 401:
        case 403:
            return new Error(`permission_denied: The connection lacks the permissions this query needs.${detail}`);
        case 404:
            return new Error(`not_found: The agent collection or a referenced resource was not found.${detail}`);
        case 406:
            return new Error(`resource_limit: Notion reported a resource or query limit.${detail}`);
        case 409:
            return new Error(`conflict: Notion reported a conflict; retry the read.${detail}`);
        case 429: {
            const retryAfter = RetryAfterHeaderSchema.safeParse(headers ?? {});
            const wait = retryAfter.success && retryAfter.data['retry-after'] !== undefined ? ` Retry after ${retryAfter.data['retry-after']} seconds.` : '';
            return new Error(`rate_limited: Notion throttled the query.${wait}${detail}`);
        }
        case 500:
        case 503:
        case 504:
        case 529:
            return new Error(`provider_unavailable: Notion is temporarily unavailable; retry later.${detail}`);
        default:
            return asError(err);
    }
}

function mapAgentSummary(agent: z.infer<typeof ProviderAgentSchema>): z.infer<typeof AgentSummarySchema> {
    return {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        agentType: agent.agent_type,
        createdAt: agent.created_time === null ? null : toUtcInstant(agent.created_time),
        lastRunAt: agent.last_run_at === null || agent.last_run_at === 'hidden' ? agent.last_run_at : toUtcInstant(agent.last_run_at),
        updatedAt: agent.last_edited_time === null ? null : toUtcInstant(agent.last_edited_time),
        creditLimit: agent.credit_limit,
        description: agent.description,
        pauseReason: agent.pause_reason
    };
}

/**
 * @tags: [read]
 * @tagReason: Sends one read-only query page request to Notion and never creates, updates, or deletes anything.
 * @pitfalls: Results only cover agents the connection can access, so an empty page may mean no access rather than no agents. creditLimit and lastRunAt are "hidden" for agents the connection cannot edit. Filtering by favorited can fail with permission_denied, and a deleted status filter matches nothing unless includeDeleted is true.
 */
const tool = createTool({
    name: 'list-agents',
    description: 'Browse or find agents by name, description, ownership, state, model, dates, and connection filters, one page at a time.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use this to discover IDs for `get-agent` and administration tools. Query matches names and descriptions case-insensitively. Pass nextCursor as cursor with the same filters and sorts. Limit is 1–100, default 100. Deleted agents are excluded unless requested.',
        requiredScopes: [],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        if (input.createdAfter !== undefined && input.createdBefore !== undefined && compareInstants(input.createdAfter, input.createdBefore) >= 0) {
            throw new Error('invalid_date_range: createdAfter must be before createdBefore.');
        }
        if (input.lastRunAfter !== undefined && input.lastRunBefore !== undefined && compareInstants(input.lastRunAfter, input.lastRunBefore) >= 0) {
            throw new Error('invalid_date_range: lastRunAfter must be before lastRunBefore.');
        }

        const leaves: AgentQueryFilterLeaf[] = [];
        if (input.agentId !== undefined) {
            leaves.push({ property: 'id', id: { equals: input.agentId } });
        }
        if (input.agentType !== undefined) {
            leaves.push({ property: 'agent_type', string: { equals: input.agentType } });
        }
        if (input.createdById !== undefined) {
            leaves.push({ property: 'created_by', people: { contains: input.createdById } });
        }
        if (input.statuses !== undefined) {
            leaves.push({ property: 'status', status: { in: input.statuses } });
        }
        if (input.favorited !== undefined) {
            leaves.push({ property: 'favorited', checkbox: { equals: input.favorited } });
        }
        if (input.mcpServer !== undefined) {
            leaves.push({ property: 'connections', mcp_server: { contains: input.mcpServer } });
        }
        if (input.modelMode !== undefined) {
            leaves.push({ property: 'model_mode', select: { equals: input.modelMode } });
        }
        if (input.agentVersion !== undefined) {
            leaves.push({ property: 'agent_version', number: { equals: input.agentVersion } });
        }
        const createdRange = buildDateRange(input.createdAfter, input.createdBefore);
        if (createdRange !== undefined) {
            leaves.push({ property: 'created_time', date: createdRange });
        }
        const lastRunRange = buildDateRange(input.lastRunAfter, input.lastRunBefore);
        if (lastRunRange !== undefined) {
            leaves.push({ property: 'last_run_at', date: lastRunRange });
        }

        const [firstLeaf] = leaves;
        let filter: AgentQueryFilter | undefined;
        if (leaves.length === 1 && firstLeaf !== undefined) {
            filter = firstLeaf;
        } else if (leaves.length > 1) {
            filter = input.match === 'any' ? { or: leaves } : { and: leaves };
        }

        const sorts: AgentQuerySort[] | undefined = input.sorts?.map((sort) => ({ property: SORT_PROPERTY_MAP[sort.field], direction: sort.direction }));

        const requestBody: AgentQueryRequestBody = {
            ...(input.query !== undefined && { query: input.query }),
            ...(filter !== undefined && { filter }),
            ...(sorts !== undefined && { sorts }),
            verbose: false,
            page_size: input.limit ?? 100,
            ...(input.cursor !== undefined && { start_cursor: input.cursor }),
            include_deleted: input.includeDeleted ?? false
        };

        // @allowTryCatch: Provider HTTP errors are mapped to the tool's documented public error codes.
        try {
            // https://developers.notion.com/reference/notion-agent-apis/query-agents
            const response = await nango.post<unknown>({
                endpoint: '/v1/agents/query',
                headers: {
                    'Notion-Version': '2026-03-11'
                },
                data: requestBody,
                retries: 3
            });
            const parsed = ProviderQueryResponseSchema.parse(response.data);
            return {
                items: parsed.results.map(mapAgentSummary),
                ...(parsed.has_more && parsed.next_cursor !== null ? { nextCursor: parsed.next_cursor } : {})
            };
        } catch (err) {
            const httpError = HttpErrorSchema.safeParse(err);
            if (httpError.success && httpError.data.response.status === 404) {
                return { items: [] };
            }
            throw mapProviderError(err);
        }
    }
});

export default tool;
