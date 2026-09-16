import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        limit: z
            .number()
            .int()
            .min(1)
            .max(100)
            .optional()
            .describe('Maximum number of business services to return per page. Defaults to the provider limit if omitted.')
    })
    .describe('Input for listing PagerDuty business services.');

const ProviderTeamSchema = z.object({
    id: z.string(),
    type: z.string(),
    self: z.string().optional(),
    summary: z.string().optional()
});

const ProviderBusinessServiceSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    summary: z.string().optional(),
    description: z.string().nullable().optional(),
    point_of_contact: z.string().nullable().optional(),
    team: ProviderTeamSchema.nullable().optional(),
    self: z.string().optional(),
    html_url: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderResponseSchema = z.object({
    business_services: z.array(ProviderBusinessServiceSchema.passthrough()),
    limit: z.number().int(),
    offset: z.number().int(),
    total: z.number().int().nullable(),
    more: z.boolean()
});

const TeamOutputSchema = z.object({
    id: z.string().describe('Team ID. Example: "PQ9K7I8"'),
    type: z.string().describe('Resource type of the team.'),
    self: z.string().optional().describe('API URL of the team resource.'),
    summary: z.string().optional().describe('Display summary of the team.')
});

const BusinessServiceOutputSchema = z.object({
    id: z.string().describe('Unique identifier of the business service. Example: "P3U7V58"'),
    name: z.string().describe('Display name of the business service.'),
    type: z.string().describe('Resource type of the business service.'),
    summary: z.string().optional().describe('Short summary of the business service.'),
    description: z.string().optional().describe('Detailed description of the business service.'),
    point_of_contact: z.string().optional().describe('Point of contact for the business service.'),
    team: TeamOutputSchema.optional().describe('Team associated with the business service.'),
    self: z.string().optional().describe('API URL of the business service resource.'),
    html_url: z.string().optional().describe('PagerDuty web UI URL of the business service.'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the business service was created.'),
    updated_at: z.string().optional().describe('ISO 8601 timestamp when the business service was last updated.')
});

const OutputSchema = z
    .object({
        business_services: z.array(BusinessServiceOutputSchema).describe('Array of business services for the current page.'),
        next_cursor: z.string().optional().describe('Cursor to fetch the next page. Omit if absent to indicate the last page.')
    })
    .describe('Output containing a page of PagerDuty business services and a pagination cursor.');

/**
 * @tags: [read]
 * @tagReason: Reads the list of business services from the PagerDuty API.
 */
const action = createAction({
    description: 'List business services (higher-level business-facing services distinct from technical Services).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['services.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;
        const limit = input.limit ?? 25;

        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/
            endpoint: '/business_services',
            params: {
                offset: String(offset),
                limit: String(limit)
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const nextOffset = providerResponse.offset + providerResponse.limit;
        const nextCursor = providerResponse.more ? String(nextOffset) : undefined;

        return {
            business_services: providerResponse.business_services.map((service) => {
                const mapped: z.infer<typeof BusinessServiceOutputSchema> = {
                    id: service.id,
                    name: service.name,
                    type: service.type
                };

                if (service.summary !== undefined && service.summary !== null) {
                    mapped.summary = service.summary;
                }
                if (service.description !== undefined && service.description !== null) {
                    mapped.description = service.description;
                }
                if (service.point_of_contact !== undefined && service.point_of_contact !== null) {
                    mapped.point_of_contact = service.point_of_contact;
                }
                if (service.team !== undefined && service.team !== null) {
                    mapped.team = {
                        id: service.team.id,
                        type: service.team.type
                    };
                    if (service.team.self !== undefined && service.team.self !== null) {
                        mapped.team.self = service.team.self;
                    }
                    if (service.team.summary !== undefined && service.team.summary !== null) {
                        mapped.team.summary = service.team.summary;
                    }
                }
                if (service.self !== undefined && service.self !== null) {
                    mapped.self = service.self;
                }
                if (service.html_url !== undefined && service.html_url !== null) {
                    mapped.html_url = service.html_url;
                }
                if (service.created_at !== undefined && service.created_at !== null) {
                    mapped.created_at = service.created_at;
                }
                if (service.updated_at !== undefined && service.updated_at !== null) {
                    mapped.updated_at = service.updated_at;
                }

                return mapped;
            }),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
