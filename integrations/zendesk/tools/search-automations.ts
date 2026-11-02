import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        query: z.string().min(1).describe('Text used by Zendesk to match automation titles; not a ticket search expression.'),
        active: z.boolean().optional().describe('True limits to active rules, false to inactive; omission includes both.'),
        cursor: z.string().min(1).optional().describe('Opaque next-page continuation for this connection, query, active filter and ordering.'),
        sortBy: z
            .enum(['alphabetical', 'createdAt', 'updatedAt', 'position'])
            .optional()
            .describe('Sort dimension; omission uses provider relevance ordering.'),
        sortOrder: z
            .enum(['asc', 'desc'])
            .optional()
            .describe('Direction; when omitted, provider defaults are asc for alphabetical/position and desc otherwise.')
    })
    .describe('Title search text with an optional active filter, continuation cursor, and result ordering.');

const ConditionSchema = z
    .object({
        field: z.string().describe('Compared ticket field.'),
        value: z.string().describe('Comparison value.'),
        operator: z.string().describe('Comparison operator.')
    })
    .describe('One stored condition on a ticket field.');

const ConditionsSchema = z
    .object({
        all: z.array(ConditionSchema).optional().describe('AND conditions.'),
        any: z.array(ConditionSchema).optional().describe('OR conditions.')
    })
    .describe('Complete stored condition sets.');

// z.number().int() compiles to {"type":"integer"} plus safe-integer minimum/maximum constraints, which stops the
// JSON Schema generator from folding a union of plain types into the contract's {"type": ["string", "integer"]}
// form. A refined number with the int format marker compiles to a bare integer type while still rejecting
// non-integers at runtime.
function integerSchema(): z.ZodNumber {
    const schema = z.number().refine((value) => Number.isInteger(value));
    schema._zod.bag.format = 'int';
    return schema;
}

const ActionValueSchema = z
    .union([z.string(), integerSchema(), z.boolean(), z.array(z.union([z.string(), integerSchema()]))])
    .describe('Stored action value, preserving scalar type and array order.');

const ActionSchema = z
    .object({
        field: z.string().describe('Ticket field or action name.'),
        value: ActionValueSchema
    })
    .describe('One stored automation action definition.');

const AutomationSchema = z
    .object({
        id: z.string().describe('Opaque automation identifier.'),
        title: z.string().describe('Displayed title.'),
        active: z.boolean().describe('Whether the rule is active.'),
        actions: z.array(ActionSchema).optional().describe('Ordered stored action definitions.'),
        position: z.number().int().optional().describe('Execution-order position.'),
        rawTitle: z.string().optional().describe('Raw title before dynamic-content rendering.'),
        createdAt: z.iso.datetime({ offset: true }).optional().describe('Creation instant in UTC.'),
        isDefault: z.boolean().optional().describe('Whether the rule is a Zendesk default.'),
        updatedAt: z.iso.datetime({ offset: true }).optional().describe('Last update instant in UTC.'),
        conditions: ConditionsSchema.optional()
    })
    .describe('One title-matching automation definition.');

const OutputSchema = z
    .object({
        items: z.array(AutomationSchema).describe('One provider page of title-matching automation definitions.'),
        nextCursor: z.string().optional().describe('Opaque next-page continuation; absent when exhausted.')
    })
    .describe('One offset-based page of automations whose titles match the query.');

const CursorSchema = z.object({
    v: z.literal(1),
    page: z.number().int().min(1),
    q: z.string().min(1),
    a: z.boolean().nullable(),
    sb: z.enum(['alphabetical', 'createdAt', 'updatedAt', 'position']).nullable(),
    so: z.enum(['asc', 'desc']).nullable()
});

const ProviderConditionSchema = z.object({
    field: z.string(),
    value: z.string(),
    operator: z.string()
});

const ProviderActionSchema = z.object({
    field: z.string(),
    value: z.union([z.string(), z.number().int(), z.boolean(), z.array(z.union([z.string(), z.number().int()]))])
});

const ProviderAutomationSchema = z.object({
    id: z.number().int(),
    title: z.string(),
    active: z.boolean(),
    actions: z.array(ProviderActionSchema).optional(),
    position: z.number().int().nullable().optional(),
    raw_title: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    default: z.boolean().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    conditions: z
        .object({
            all: z.array(ProviderConditionSchema).optional(),
            any: z.array(ProviderConditionSchema).optional()
        })
        .nullable()
        .optional()
});

const ProviderResponseSchema = z.object({
    automations: z.array(ProviderAutomationSchema).optional(),
    next_page: z.string().nullable().optional()
});

function encodeCursor(cursor: z.infer<typeof CursorSchema>): string {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function decodeCursor(raw: string): z.infer<typeof CursorSchema> {
    // @allowTryCatch: any base64, JSON, or shape failure means the continuation is not one this tool issued.
    try {
        return CursorSchema.parse(JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')));
    } catch {
        throw new Error('invalid_cursor: Continuation is invalid or mismatches the search. Restart without cursor.');
    }
}

function toSortByParam(sortBy: 'alphabetical' | 'createdAt' | 'updatedAt' | 'position'): string {
    switch (sortBy) {
        case 'createdAt':
            return 'created_at';
        case 'updatedAt':
            return 'updated_at';
        default:
            return sortBy;
    }
}

function nextPageNumber(nextPageUrl: string): number | null {
    const match = /[?&]page=(\d+)/.exec(nextPageUrl);
    if (match && match[1] !== undefined && /^[1-9]\d*$/.test(match[1])) {
        return Number(match[1]);
    }
    return null;
}

function toUtcIso(value: string): string {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? value : new Date(ms).toISOString();
}

function httpStatus(error: unknown): number | null {
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = error.response;
        if (typeof response === 'object' && response !== null && 'status' in response && typeof response.status === 'number') {
            return response.status;
        }
    }
    return null;
}

/**
 * @tags: [read]
 * @tagReason: Searches automation definitions through a read-only Zendesk GET request.
 * @pitfalls: Requires an agent connection with automation read access. Pages can shift under concurrent changes and browsing stops at Zendesk's offset limit of 100 pages or 10,000 matches. Without sortBy, ordering is by relevance; without sortOrder, direction defaults to asc for alphabetical/position but desc for createdAt/updatedAt.
 */
const tool = createTool({
    name: 'search-automations',
    description: 'Find one page of automations whose titles match a query, optionally filtering by active state and choosing result order.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            "Use this when you know words in a rule's title; use `list-automations` for ordinary enumeration. Pass nextCursor as cursor with unchanged query and ordering to continue. Results use offset pagination and cannot browse beyond Zendesk's offset limit.",
        requiredScopes: [],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        let page = 1;
        if (input.cursor !== undefined) {
            const cursor = decodeCursor(input.cursor);
            if (
                cursor.q !== input.query ||
                cursor.a !== (input.active ?? null) ||
                cursor.sb !== (input.sortBy ?? null) ||
                cursor.so !== (input.sortOrder ?? null)
            ) {
                throw new Error('invalid_cursor: Continuation is invalid or mismatches the search. Restart without cursor.');
            }
            page = cursor.page;
        }

        const params: { query: string; active?: string; sort_by?: string; sort_order?: string; page?: string } = { query: input.query };
        if (input.active !== undefined) {
            params.active = input.active ? 'true' : 'false';
        }
        if (input.sortBy !== undefined) {
            params.sort_by = toSortByParam(input.sortBy);
        }
        if (input.sortOrder !== undefined) {
            params.sort_order = input.sortOrder;
        }
        if (page > 1) {
            params.page = String(page);
        }

        let response;
        // @allowTryCatch: provider HTTP errors are remapped to the tool's public error codes.
        try {
            // https://developer.zendesk.com/api-reference/ticketing/business-rules/automations/#search-automations
            response = await nango.get({
                endpoint: '/api/v2/automations/search',
                params,
                retries: 3
            });
        } catch (error) {
            const status = httpStatus(error);
            if (status === 401 || status === 403) {
                throw new Error(
                    'permission_denied: The connected user lacks agent or automation read access. Use an appropriately authorized agent connection.'
                );
            }
            if (status === 429) {
                throw new Error('rate_limited: A provider rate limit is exceeded. Wait for Retry-After and retry the same search page.');
            }
            if (status === 400) {
                throw new Error(
                    "pagination_limit: Zendesk's offset page-depth/resource limit is reached. Narrow the title query or active filter; use list-automations for cursor-based enumeration."
                );
            }
            throw error;
        }

        const data = ProviderResponseSchema.parse(response.data);

        const items = (data.automations ?? []).map((automation) => ({
            id: String(automation.id),
            title: automation.title,
            active: automation.active,
            ...(automation.actions !== undefined && { actions: automation.actions }),
            ...(automation.position != null && { position: automation.position }),
            ...(automation.raw_title != null && { rawTitle: automation.raw_title }),
            ...(automation.created_at != null && { createdAt: toUtcIso(automation.created_at) }),
            ...(automation.default != null && { isDefault: automation.default }),
            ...(automation.updated_at != null && { updatedAt: toUtcIso(automation.updated_at) }),
            ...(automation.conditions != null && { conditions: automation.conditions })
        }));

        const result: z.infer<typeof OutputSchema> = { items };
        if (data.next_page != null && data.next_page !== '') {
            result.nextCursor = encodeCursor({
                v: 1,
                page: nextPageNumber(data.next_page) ?? page + 1,
                q: input.query,
                a: input.active ?? null,
                sb: input.sortBy ?? null,
                so: input.sortOrder ?? null
            });
        }
        return result;
    }
});

export default tool;
