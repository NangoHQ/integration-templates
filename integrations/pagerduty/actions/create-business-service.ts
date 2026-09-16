import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe('Name of the business service.'),
        description: z.string().optional().describe('Description of the business service.'),
        point_of_contact: z.string().optional().describe('Point of contact for the business service.'),
        team_id: z.string().optional().describe('ID of the team to associate with the business service.')
    })
    .describe('Input for creating a PagerDuty business service.');

const ProviderBusinessServiceSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    point_of_contact: z.string().nullable().optional(),
    team: z
        .object({
            id: z.string(),
            type: z.string()
        })
        .nullable()
        .optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    type: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the business service.'),
        name: z.string().describe('Name of the business service.'),
        description: z.string().optional().describe('Description of the business service.'),
        point_of_contact: z.string().optional().describe('Point of contact for the business service.'),
        team_id: z.string().optional().describe('ID of the associated team.'),
        self: z.string().optional().describe('API URL of the business service.'),
        html_url: z.string().optional().describe('PagerDuty web URL of the business service.'),
        created_at: z.string().optional().describe('ISO 8601 timestamp when the business service was created.'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp when the business service was last updated.'),
        type: z.string().optional().describe('PagerDuty resource type.')
    })
    .describe('Output of a newly created PagerDuty business service.');

/**
 * @tags: [write]
 * @tagReason: Creates a new business service on the PagerDuty account.
 * @pitfalls: Business service names must be unique within the account; a duplicate name returns a 400 error.
 */
const action = createAction({
    description: 'Create a business service.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.pagerduty.com/api-reference/
        const response = await nango.post({
            endpoint: '/business_services',
            data: {
                business_service: {
                    type: 'business_service',
                    name: input.name,
                    ...(input.description !== undefined && { description: input.description }),
                    ...(input.point_of_contact !== undefined && { point_of_contact: input.point_of_contact }),
                    ...(input.team_id !== undefined && { team: { id: input.team_id, type: 'team_reference' } })
                }
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                business_service: ProviderBusinessServiceSchema
            })
            .parse(response.data);

        const bs = providerResponse.business_service;

        return {
            id: bs.id,
            name: bs.name,
            ...(bs.description != null && { description: bs.description }),
            ...(bs.point_of_contact != null && { point_of_contact: bs.point_of_contact }),
            ...(bs.team != null && { team_id: bs.team.id }),
            ...(bs.self != null && { self: bs.self }),
            ...(bs.html_url != null && { html_url: bs.html_url }),
            ...(bs.created_at != null && { created_at: bs.created_at }),
            ...(bs.updated_at != null && { updated_at: bs.updated_at }),
            ...(bs.type != null && { type: bs.type })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
