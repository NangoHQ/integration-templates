import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const ProviderPrioritySchema = z.object({
    id: z.string(),
    type: z.string().optional(),
    name: z.string(),
    description: z.string().nullish(),
    color: z.string(),
    order: z.number(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const PrioritySchema = z.object({
    id: z.string().describe('Unique identifier for the priority.'),
    type: z.string().optional().describe('Type of the priority object.'),
    name: z.string().describe('Display name of the priority level, e.g. P1.'),
    description: z.string().optional().describe('Description of the priority.'),
    color: z.string().describe('Color associated with the priority for UI display.'),
    order: z.number().describe('Numeric order of the priority (lower is higher priority).'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the priority was created.'),
    updated_at: z.string().optional().describe('ISO 8601 timestamp when the priority was last updated.')
});

const InputSchema = z
    .object({
        cursor: z.number().optional().describe('Pagination offset from the previous response. Omit for the first page.'),
        limit: z.number().optional().describe('Maximum number of priorities to return per page.')
    })
    .describe('Input for listing PagerDuty incident priorities.');

const OutputSchema = z
    .object({
        priorities: z.array(PrioritySchema).describe('List of incident priority levels configured on the account.'),
        next_offset: z.number().optional().describe('Offset for the next page. Omit if there are no more pages.'),
        limit: z.number().describe('Number of priorities returned in this page.'),
        total: z.number().optional().describe('Total number of priorities available on the account.')
    })
    .describe('Output containing the list of PagerDuty incident priorities.');

const ProviderResponseSchema = z.object({
    priorities: z.array(ProviderPrioritySchema),
    limit: z.number(),
    offset: z.number(),
    total: z.number().nullable().optional(),
    more: z.boolean()
});

/**
 * @tags: [read]
 * @tagReason: Retrieves the account's configured incident priority levels.
 * @pitfalls: Priorities are immutable read-only account defaults; the API does not support creating, updating, or deleting priority levels.
 */
const action = createAction({
    description: "List the account's configured incident priority levels (P1-P5).",
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['priorities.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 25;
        const offset = input.cursor ?? 0;

        const config: ProxyConfiguration = {
            // https://developer.pagerduty.com/api-reference/reference/REST/openapiv3.json/paths/~1priorities/get
            endpoint: '/priorities',
            params: {
                limit,
                offset,
                total: 'true'
            },
            retries: 3
        };

        const response = await nango.get(config);
        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            priorities: providerData.priorities.map((priority) => ({
                id: priority.id,
                ...(priority.type !== undefined && { type: priority.type }),
                name: priority.name,
                ...(priority.description != null && { description: priority.description }),
                color: priority.color,
                order: priority.order,
                ...(priority.created_at !== undefined && { created_at: priority.created_at }),
                ...(priority.updated_at !== undefined && { updated_at: priority.updated_at })
            })),
            limit: providerData.limit,
            ...(providerData.more && { next_offset: providerData.offset + providerData.limit }),
            ...(providerData.total != null && { total: providerData.total })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
