import { z } from 'zod';
import { createTool } from 'nango';

const DEFAULT_LIMIT = 20;

const queryField = z.string().min(1).max(1000).describe("Free text across workflow properties, matching Ironclad's in-app search.");
const formulaField = z
    .string()
    .min(1)
    .describe('Ironclad attribute formula; attribute IDs use brackets and string values use single quotes. Preserves advanced formula control.');
const limitField = z.number().int().min(1).max(100).optional().describe('Maximum results in this page; public cap 100 is provisional.');
const cursorField = z.string().min(1).optional().describe('Opaque continuation from this search with unchanged criteria and limit.');
const statusesField = z
    .array(z.enum(['active', 'paused', 'completed', 'cancelled']))
    .min(1)
    .meta({ uniqueItems: true })
    .optional()
    .describe('Statuses to search; omitted means active only.');
const templateIdField = z.string().min(1).optional().describe('Restrict matching to one template ID.');
const updatedSinceField = z.iso
    .datetime({ offset: true })
    .meta({ pattern: '(Z|[+-][0-9]{2}:[0-9]{2})$' })
    .optional()
    .describe('Modification boundary with explicit offset, normalized to UTC without rounding.');

const InputSchema = z
    .object({
        limit: limitField,
        query: queryField.optional(),
        cursor: cursorField,
        formula: formulaField.optional(),
        statuses: statusesField,
        templateId: templateIdField,
        updatedSince: updatedSinceField
    })
    .describe('Search criteria for finding workflows. At least one of query or formula is required.')
    .meta({ anyOf: [{ required: ['query'] }, { required: ['formula'] }] });

const WorkflowSummarySchema = z
    .object({
        id: z.string().describe('Canonical workflow ID.'),
        step: z.string().describe('Current workflow stage.'),
        title: z.string().describe('Workflow title.'),
        status: z.string().describe('Workflow lifecycle state.'),
        createdAt: z.iso.datetime({ offset: true }).describe('Launch instant in UTC Z.'),
        updatedAt: z.iso.datetime({ offset: true }).describe('Last modification instant in UTC Z.'),
        ironcladId: z.string().optional().describe('Human-readable workflow ID when available.'),
        recordType: z.string().optional().describe('Resolved record type ID if available.'),
        templateId: z.string().describe('Template ID.'),
        recordTypeDisplayName: z.string().optional().describe('Resolved record type label if available.')
    })
    .describe('A matching workflow summary.');

const OutputSchema = z
    .object({
        items: z.array(WorkflowSummarySchema).describe('Matching workflow summaries from one provider page in provider order.'),
        nextCursor: z.string().optional().describe('Opaque continuation; omitted when exhausted.')
    })
    .describe('One page of workflows matching the search criteria.');

type SearchInput = z.infer<typeof InputSchema>;

const ProviderWorkflowSchema = z.object({
    id: z.string(),
    title: z.string(),
    template: z.string(),
    step: z.string(),
    status: z.string(),
    created: z.string(),
    lastUpdated: z.string(),
    ironcladId: z.string().optional(),
    recordType: z.string().optional(),
    recordTypeDisplayName: z.string().optional()
});

const ProviderWorkflowListSchema = z.object({
    list: z.array(ProviderWorkflowSchema).optional(),
    page: z.number().int().optional(),
    pageSize: z.number().int().optional(),
    count: z.number().int().optional()
});

const CursorSchema = z.object({
    v: z.literal(1),
    page: z.number().int().min(1),
    key: z.string().min(1)
});

const ISO_DATETIME_PATTERN =
    /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T(?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})(?:\.(?<fraction>\d+))?(?<zone>Z|[+-]\d{2}:\d{2})$/;

function padNumber(value: number, width: number): string {
    return String(value).padStart(width, '0');
}

/**
 * Converts an ISO 8601 datetime with an explicit offset to UTC Z form.
 * The fractional second part passes through untouched because offsets are whole
 * minutes, so no precision is ever dropped. Returns null when the instant cannot
 * be represented exactly (invalid date, or a year outside 0000-9999 after the shift).
 */
function toUtcIso(value: string): string | null {
    const groups = ISO_DATETIME_PATTERN.exec(value)?.groups;
    if (!groups) {
        return null;
    }
    const { year, month, day, hour, minute, second, zone } = groups;
    if (
        year === undefined ||
        month === undefined ||
        day === undefined ||
        hour === undefined ||
        minute === undefined ||
        second === undefined ||
        zone === undefined
    ) {
        return null;
    }
    const date = new Date(Date.UTC(2000, 0, 1));
    date.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
    date.setUTCHours(Number(hour), Number(minute), Number(second), 0);
    if (
        date.getUTCFullYear() !== Number(year) ||
        date.getUTCMonth() + 1 !== Number(month) ||
        date.getUTCDate() !== Number(day) ||
        date.getUTCHours() !== Number(hour) ||
        date.getUTCMinutes() !== Number(minute) ||
        date.getUTCSeconds() !== Number(second)
    ) {
        return null;
    }
    if (zone !== 'Z') {
        const offsetMinutes = Number(zone.slice(1, 3)) * 60 + Number(zone.slice(4, 6));
        const signedOffsetMinutes = zone.charAt(0) === '-' ? -offsetMinutes : offsetMinutes;
        date.setTime(date.getTime() - signedOffsetMinutes * 60_000);
    }
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    const fullYear = date.getUTCFullYear();
    if (fullYear < 0 || fullYear > 9999) {
        return null;
    }
    const shifted = `${padNumber(fullYear, 4)}-${padNumber(date.getUTCMonth() + 1, 2)}-${padNumber(date.getUTCDate(), 2)}T${padNumber(date.getUTCHours(), 2)}:${padNumber(date.getUTCMinutes(), 2)}:${padNumber(date.getUTCSeconds(), 2)}`;
    const fraction = groups['fraction'];
    return fraction !== undefined && fraction.length > 0 ? `${shifted}.${fraction}Z` : `${shifted}Z`;
}

function canonicalCriteriaKey(input: SearchInput, limit: number, lastUpdated: string | undefined): string {
    return JSON.stringify({
        query: input.query ?? null,
        formula: input.formula ?? null,
        statuses: input.statuses ? [...new Set(input.statuses)].sort() : null,
        templateId: input.templateId ?? null,
        updatedSince: lastUpdated ?? null,
        limit
    });
}

function encodeCursor(page: number, criteriaKey: string): string {
    return Buffer.from(JSON.stringify({ v: 1, page, key: criteriaKey }), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): { page: number; key: string } {
    let raw: unknown;
    // @allowTryCatch: a caller-supplied opaque cursor can be malformed; a JSON parse failure must surface as the public invalid_cursor error.
    try {
        raw = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    } catch {
        throw new Error(
            'invalid_cursor: The cursor is invalid or mismatches the search criteria. Restart without cursor or restore the original search criteria.'
        );
    }
    const parsed = CursorSchema.safeParse(raw);
    if (!parsed.success) {
        throw new Error(
            'invalid_cursor: The cursor is invalid or mismatches the search criteria. Restart without cursor or restore the original search criteria.'
        );
    }
    return parsed.data;
}

function httpStatusOf(error: unknown): number | undefined {
    if (error !== null && typeof error === 'object' && 'response' in error) {
        const response = error.response;
        if (response !== null && typeof response === 'object' && 'status' in response && typeof response.status === 'number') {
            return response.status;
        }
    }
    return undefined;
}

/**
 * @tags: [read]
 * @tagReason: The tool only reads one page of workflows from Ironclad; it never creates, updates, or deletes provider data.
 * @pitfalls: Without a statuses filter Ironclad matches active workflows only, and active still includes the Archive stage, so completed, paused, or cancelled workflows are silently missed; results are limited to what the connection's acting user is permitted to access.
 */
const tool = createTool({
    name: 'search-workflows',
    description: 'Find one page of workflows using free text across workflow properties and/or an Ironclad attribute formula.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use for matching rather than browsing. Get attribute IDs from `list-workflow-schemas` before writing a formula. Text, formula, and other filters are ANDed. Use `list-workflows` for ordinary browsing and `get-workflow` for a known ID. Continue with nextCursor as cursor and unchanged criteria/limit. Default 20, maximum 100 results per call.',
        requiredScopes: ['public.workflows.readWorkflows'],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;
        if (input.query === undefined && input.formula === undefined) {
            throw new Error('invalid_request: At least one of query or formula is required.');
        }
        const limit = input.limit ?? DEFAULT_LIMIT;

        let lastUpdated: string | undefined;
        if (input.updatedSince !== undefined) {
            const converted = toUtcIso(input.updatedSince);
            if (converted === null) {
                throw new Error(
                    'unsupported_timestamp_precision: The update boundary cannot be represented exactly. Supply a precisely representable timestamp.'
                );
            }
            lastUpdated = converted;
        }

        const criteriaKey = canonicalCriteriaKey(input, limit, lastUpdated);
        let page = 0;
        if (input.cursor !== undefined) {
            const decoded = decodeCursor(input.cursor);
            if (decoded.key !== criteriaKey) {
                throw new Error(
                    'invalid_cursor: The cursor is invalid or mismatches the search criteria. Restart without cursor or restore the original search criteria.'
                );
            }
            page = decoded.page;
        }

        const status = input.statuses ? [...new Set(input.statuses)].join(',') : 'active';

        let response: { data: unknown };
        // @allowTryCatch: Ironclad error responses are mapped to the public error codes; every other error is rethrown unchanged.
        try {
            // https://developer.ironcladapp.com/reference/list-all-workflows
            response = await nango.get({
                endpoint: '/workflows',
                params: {
                    page,
                    pageSize: limit,
                    hydrateEntities: 'false',
                    status,
                    ...(input.templateId !== undefined && { template: input.templateId }),
                    ...(lastUpdated !== undefined && { lastUpdated }),
                    ...(input.formula !== undefined && { filter: input.formula }),
                    ...(input.query !== undefined && { search: input.query })
                },
                retries: 3
            });
        } catch (error) {
            const httpStatus = httpStatusOf(error);
            if (httpStatus === 400) {
                return { items: [] };
            }
            if (httpStatus === 401 || httpStatus === 403) {
                throw new Error(
                    'permission_denied: The actor or connection cannot read workflows. Ask an administrator for workflow access and the public.workflows.readWorkflows scope.'
                );
            }
            throw error;
        }

        const parsed = ProviderWorkflowListSchema.parse(response.data);
        const list = parsed.list ?? [];
        const currentPage = parsed.page ?? page;
        const pageSize = parsed.pageSize ?? limit;
        const retrieved = currentPage * pageSize + list.length;
        const hasMore = list.length > 0 && (parsed.count !== undefined ? parsed.count > retrieved : list.length === pageSize);

        const items = list.map((entry) => {
            const createdAt = toUtcIso(entry.created);
            if (createdAt === null) {
                throw new Error(`Ironclad returned a created timestamp that could not be normalized for workflow '${entry.id}'.`);
            }
            const updatedAt = toUtcIso(entry.lastUpdated);
            if (updatedAt === null) {
                throw new Error(`Ironclad returned a lastUpdated timestamp that could not be normalized for workflow '${entry.id}'.`);
            }
            return {
                id: entry.id,
                step: entry.step,
                title: entry.title,
                status: entry.status,
                createdAt,
                updatedAt,
                templateId: entry.template,
                ...(entry.ironcladId !== undefined && { ironcladId: entry.ironcladId }),
                ...(entry.recordType !== undefined && { recordType: entry.recordType }),
                ...(entry.recordTypeDisplayName !== undefined && { recordTypeDisplayName: entry.recordTypeDisplayName })
            };
        });

        return {
            items,
            ...(hasMore && { nextCursor: encodeCursor(currentPage + 1, criteriaKey) })
        };
    }
});

export default tool;
