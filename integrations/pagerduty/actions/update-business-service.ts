import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the business service to update.'),
        name: z.string().optional().describe('The new name for the business service.'),
        description: z.string().optional().describe('The new description for the business service.'),
        point_of_contact: z.string().nullable().optional().describe('The new point of contact. Set to null to clear.'),
        team_id: z.string().optional().describe('The ID of the team to associate with this business service.')
    })
    .describe('Input for updating a PagerDuty business service.');

const TeamReferenceSchema = z.object({
    id: z.string().describe('The team ID.'),
    type: z.string().describe('The team reference type.'),
    summary: z.string().optional().describe('A short summary of the team.'),
    self: z.string().optional().describe('The API URL of the team.'),
    html_url: z.string().optional().describe('The PagerDuty web URL of the team.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the business service.'),
        name: z.string().describe('The name of the business service.'),
        type: z.literal('business_service').describe('The resource type.'),
        description: z.string().optional().describe('The description of the business service.'),
        point_of_contact: z.string().nullable().optional().describe('The point of contact for the business service.'),
        summary: z.string().optional().describe('A short summary of the business service.'),
        self: z.string().optional().describe('The API URL of the business service.'),
        html_url: z.string().nullable().optional().describe('The PagerDuty web URL of the business service.'),
        team: TeamReferenceSchema.nullable().optional().describe('The team associated with the business service.')
    })
    .describe('The updated PagerDuty business service.');

/**
 * @tags: [write]
 * @tagReason: Mutates mutable fields on an existing PagerDuty business service.
 */
const action = createAction({
    description: 'Update a PagerDuty business service.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.pagerduty.com/api-reference/3c0b757b83e2a-update-a-business-service
        const response = await nango.put({
            endpoint: `/business_services/${encodeURIComponent(input.id)}`,
            data: {
                business_service: {
                    type: 'business_service',
                    ...(input.name !== undefined && { name: input.name }),
                    ...(input.description !== undefined && { description: input.description }),
                    ...(input.point_of_contact !== undefined && { point_of_contact: input.point_of_contact }),
                    ...(input.team_id !== undefined && { team: { id: input.team_id, type: 'team_reference' } })
                }
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            business_service: OutputSchema
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return parsed.business_service;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
