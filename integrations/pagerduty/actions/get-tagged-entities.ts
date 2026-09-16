import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        tag_id: z.string().describe('The ID of the tag whose assigned entities to list.'),
        entity_type: z.enum(['users', 'teams', 'escalation_policies']).describe('The type of entity to list. One of users, teams, or escalation_policies.'),
        limit: z.number().optional().describe('Maximum number of results per page. Defaults to the provider default (usually 25).'),
        offset: z.number().optional().describe('Pagination offset. Omit for the first page.'),
        include_total: z
            .boolean()
            .optional()
            .describe('Whether to include the total count of matching entities in the response. Defaults to false for faster responses.')
    })
    .describe('Input for retrieving entities tagged with a specific PagerDuty tag.');

const EntitySchema = z
    .object({
        id: z.string().describe('The PagerDuty entity ID.'),
        type: z.string().describe('The PagerDuty entity type, e.g. "team_reference" or "user_reference".'),
        summary: z.string().optional().describe('A short summary or name of the entity.'),
        self: z.string().optional().describe('The API URL of the entity.'),
        html_url: z.string().optional().describe('The PagerDuty web URL of the entity.')
    })
    .passthrough();

const OutputSchema = z
    .object({
        items: z.array(EntitySchema).describe('The entities that carry the requested tag.'),
        limit: z.number().describe('The page size used for this response.'),
        offset: z.number().describe('The offset used for this response.'),
        total: z.number().optional().describe('The total number of matching entities, if requested and available.'),
        more: z.boolean().describe('Whether additional pages of results are available.'),
        next_offset: z.number().optional().describe('The offset to use for the next page, if more results are available.')
    })
    .describe('Output containing entities that carry the requested tag and pagination metadata.');

const ProviderResponseSchema = z.object({
    users: z.array(z.unknown()).optional(),
    teams: z.array(z.unknown()).optional(),
    escalation_policies: z.array(z.unknown()).optional(),
    limit: z.number(),
    offset: z.number(),
    total: z.number().nullable(),
    more: z.boolean()
});

/**
 * @tags: [read]
 * @tagReason: Reads tag-to-entity assignments from PagerDuty.
 * @pitfalls: Returned items are lightweight reference objects that may contain only id and type without summary, self, or html_url.
 */
const action = createAction({
    description: 'List the users, teams, or escalation policies that carry a given tag.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const entityType = input.entity_type;

        // https://developer.pagerduty.com/api-reference/
        const response = await nango.get({
            endpoint: `/tags/${encodeURIComponent(input.tag_id)}/${encodeURIComponent(entityType)}`,
            params: {
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.offset !== undefined && { offset: String(input.offset) }),
                ...(input.include_total === true && { total: 'true' })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const rawItems = parsed.users ?? parsed.teams ?? parsed.escalation_policies ?? [];
        const items = rawItems.map((item) => EntitySchema.parse(item));

        return {
            items,
            limit: parsed.limit,
            offset: parsed.offset,
            ...(parsed.total != null && { total: parsed.total }),
            more: parsed.more,
            ...(parsed.more && { next_offset: parsed.offset + parsed.limit })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
