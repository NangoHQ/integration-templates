import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
        limit: z.number().optional().describe('Number of results per page. Omit to use the provider default.'),
        name: z.string().optional().describe('Filter results by service name substring.'),
        team_ids: z.array(z.string()).optional().describe('Filter results by team IDs.'),
        time_zone: z.string().optional().describe('Time zone to use for date/time fields in the response.'),
        sort_by: z.string().optional().describe('Field to sort results by, e.g. `name` or `created_at`.'),
        include: z.array(z.string()).optional().describe('Additional related objects to include, e.g. `escalation_policies`, `teams`, or `integrations`.'),
        total: z.boolean().optional().describe('Request the total count of matching results. Disabled by default for faster responses.')
    })
    .describe('Input for listing PagerDuty services.');

const ReferenceSchema = z
    .object({
        id: z.string().describe('Resource ID.'),
        type: z.string().describe('Resource type.'),
        summary: z.string().nullish().describe('Human-readable summary.'),
        self: z.string().nullish().describe('API URL of the resource.'),
        html_url: z.string().nullish().describe('Web URL of the resource.')
    })
    .passthrough()
    .describe('PagerDuty reference object for a related resource.');

const ServiceSchema = z
    .object({
        id: z.string().describe('Service ID.'),
        name: z.string().describe('Service name.'),
        description: z.string().nullish().describe('Service description.'),
        status: z.string().describe('Current status of the service.'),
        type: z.string().describe('Resource type.'),
        created_at: z.string().nullish().describe('ISO 8601 timestamp when the service was created.'),
        updated_at: z.string().nullish().describe('ISO 8601 timestamp when the service was last updated.'),
        html_url: z.string().nullish().describe('Web URL of the service.'),
        self: z.string().nullish().describe('API URL of the service.'),
        summary: z.string().nullish().describe('Human-readable summary of the service.'),
        escalation_policy: ReferenceSchema.nullish().describe('Escalation policy assigned to the service.'),
        teams: z.array(ReferenceSchema).nullish().describe('Teams associated with the service.'),
        integrations: z.array(ReferenceSchema).nullish().describe('Integrations configured on the service.')
    })
    .passthrough()
    .describe('PagerDuty service object.');

const OutputSchema = z
    .object({
        services: z.array(ServiceSchema).describe('Array of services matching the query.'),
        limit: z.number().describe('Number of results returned in this page.'),
        offset: z.number().describe('Pagination offset of this page.'),
        total: z.number().optional().describe('Total number of matching results if requested.'),
        more: z.boolean().describe('Whether additional pages of results are available.'),
        next_cursor: z.string().optional().describe('Cursor to request the next page of results. Absent when there are no more pages.')
    })
    .describe('Output from listing PagerDuty services.');

const ProviderResponseSchema = z.object({
    services: z.array(z.unknown()),
    limit: z.number(),
    offset: z.number(),
    total: z.number().nullish(),
    more: z.boolean()
});

/**
 * @tags: [read]
 * @tagReason: Retrieves existing services from the PagerDuty API.
 * @pitfalls: Service status is dynamic and driven by open incidents (`critical`) or active maintenance windows (`maintenance`), changing without any direct update to the service itself.
 */
const action = createAction({
    description: 'List services, optionally filtered by team or name.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['services.read'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let offset = 0;
        if (input.cursor !== undefined) {
            const parsedOffset = Number(input.cursor);
            if (!/^\d+$/.test(input.cursor) || !Number.isSafeInteger(parsedOffset)) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a non-negative integer offset string'
                });
            }
            offset = parsedOffset;
        }

        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/e544c1de0c22f-list-services
            endpoint: '/services',
            params: {
                offset: offset,
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.total !== undefined && { total: String(input.total) }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.team_ids !== undefined && { 'team_ids[]': input.team_ids }),
                ...(input.time_zone !== undefined && { time_zone: input.time_zone }),
                ...(input.sort_by !== undefined && { sort_by: input.sort_by }),
                ...(input.include !== undefined && { 'include[]': input.include })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            services: z.array(ServiceSchema).parse(parsed.services),
            limit: parsed.limit,
            offset: parsed.offset,
            total: parsed.total ?? undefined,
            more: parsed.more,
            ...(parsed.more && { next_cursor: String(offset + parsed.limit) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
