import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        limit: z.number().int().min(1).max(100).optional().describe('Maximum field changes in this page; public cap 100.'),
        cursor: z.string().min(1).optional().describe("Opaque continuation for this deal's field history."),
        dealId: z
            .string()
            .regex(/^[0-9]+$/)
            .describe('Deal whose field changes to list.')
    })
    .describe("Parameters for listing one page of a deal's field changes.");

const FieldChangeSchema = z
    .object({
        fieldKey: z.string().optional().describe('Provider key of the changed field.'),
        newValue: z.string().nullable().optional().describe('New field value as historical text, or null.'),
        oldValue: z
            .string()
            .nullable()
            .optional()
            .describe("Previous field value as the provider's historical text, or null; not reinterpreted by field type."),
        changedAt: z.iso.datetime({ offset: true }).optional().describe('Change instant normalized to UTC Z, retaining provider precision.'),
        userAgent: z.string().nullable().optional().describe('Originating user agent, or null.'),
        actorUserId: z.string().optional().describe('User who made the change.'),
        changeSource: z.string().nullable().optional().describe('Provider change source, such as app or api, or null.'),
        isBatchUpdate: z.boolean().optional().describe('Whether the change was part of a provider bulk update.')
    })
    .describe('A single change to a deal field value.');

const OutputSchema = z
    .object({
        items: z.array(FieldChangeSchema).describe('One page of field changes in provider order.'),
        nextCursor: z.string().optional().describe('Opaque next-page token, omitted when exhausted.')
    })
    .describe("One page of a deal's field changes plus the cursor to continue.");

const ChangelogEntrySchema = z.object({
    time: z.string().optional(),
    field_key: z.string().optional(),
    new_value: z.string().nullable().optional(),
    old_value: z.string().nullable().optional(),
    actor_user_id: z.number().nullable().optional(),
    change_source: z.string().nullable().optional(),
    is_bulk_update_flag: z.boolean().nullable().optional(),
    change_source_user_agent: z.string().nullable().optional()
});

const ChangelogResponseSchema = z.object({
    data: z.array(ChangelogEntrySchema).optional(),
    additional_data: z
        .object({
            next_cursor: z.string().nullable().optional()
        })
        .optional()
});

function httpStatusCode(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null || !('response' in error)) {
        return undefined;
    }
    const response = error.response;
    if (typeof response !== 'object' || response === null || !('status' in response)) {
        return undefined;
    }
    const status = response.status;
    return typeof status === 'number' ? status : undefined;
}

function toUtcIsoDateTime(time: string): string {
    const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/.exec(time);
    if (!match || match[1] === undefined || match[2] === undefined) {
        return time;
    }
    const date = match[1];
    const hms = match[2];
    const fraction = match[3] ?? '';
    const zone = match[4];
    if (zone === undefined || zone === 'Z') {
        // Pipedrive history times without an offset are UTC.
        return `${date}T${hms}${fraction}Z`;
    }
    const milliseconds = fraction.slice(1, 4).padEnd(3, '0');
    const normalizedZone = zone.length === 5 ? `${zone.slice(0, 3)}:${zone.slice(3)}` : zone;
    const instant = Date.parse(`${date}T${hms}.${milliseconds}${normalizedZone}`);
    if (Number.isNaN(instant)) {
        return time;
    }
    const iso = new Date(instant).toISOString();
    const extraPrecision = fraction.slice(4);
    return extraPrecision.length > 0 ? iso.replace('Z', `${extraPrecision}Z`) : iso;
}

/**
 * @tags: [read]
 * @tagReason: Reads one page of deal field-change history from the provider and never mutates provider data.
 * @pitfalls: Custom fields appear under their hash field key, not a display name (map hashes to names via deal fields); each page costs 20 tokens of Pipedrive's daily token-based rate-limit budget.
 */
const tool = createTool({
    name: 'list-deal-field-changes',
    description: "List one page of changes to a deal's field values, including actor and change source.",
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use a deal ID from `get-deal` or `list-deals`. Use `list-deal-updates` for the broader mixed-resource timeline, or the follower and participant changelog tools for membership history. Pass nextCursor as cursor with the same deal ID to continue.',
        requiredScopes: ['recents:read'],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },

    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        let responseData: unknown;
        // @allowTryCatch: provider HTTP failures must be re-thrown as the tool's public not_found / permission_denied / invalid_cursor error codes.
        try {
            // https://developers.pipedrive.com/docs/api/v1/Deals#getDealChangelog
            const response = await nango.get({
                endpoint: `/v1/deals/${encodeURIComponent(input.dealId)}/changelog`,
                params: {
                    limit: input.limit ?? 100,
                    ...(input.cursor !== undefined && { cursor: input.cursor })
                },
                retries: 3
            });
            responseData = response.data;
        } catch (error) {
            const status = httpStatusCode(error);
            if (status === 404) {
                throw new Error('not_found: The deal or its accessible history is unavailable. Check the deal with `get-deal`.');
            }
            if (status === 401 || status === 403) {
                throw new Error("permission_denied: History scope or access is missing. Ask for recents:read and access to the deal's history.");
            }
            if (status === 400 && input.cursor !== undefined) {
                throw new Error('invalid_cursor: The history cursor is rejected. Restart the history without cursor.');
            }
            throw error;
        }

        const parsed = ChangelogResponseSchema.parse(responseData);
        const entries = parsed.data ?? [];
        const nextCursor = parsed.additional_data?.next_cursor;

        return {
            items: entries.map((entry) => ({
                ...(entry.field_key !== undefined && { fieldKey: entry.field_key }),
                ...(entry.new_value !== undefined && { newValue: entry.new_value }),
                ...(entry.old_value !== undefined && { oldValue: entry.old_value }),
                ...(entry.time !== undefined && { changedAt: toUtcIsoDateTime(entry.time) }),
                ...(entry.change_source_user_agent !== undefined && { userAgent: entry.change_source_user_agent }),
                ...(entry.actor_user_id != null && { actorUserId: String(entry.actor_user_id) }),
                ...(entry.change_source !== undefined && { changeSource: entry.change_source }),
                ...(entry.is_bulk_update_flag != null && { isBatchUpdate: entry.is_bulk_update_flag })
            })),
            ...(nextCursor != null && { nextCursor })
        };
    }
});

export default tool;
