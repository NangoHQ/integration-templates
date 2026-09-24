import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the business service. Example: "P8ISG1I"')
    })
    .describe('Input for retrieving a single business service.');

const ProviderBusinessServiceSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    self: z.string().optional(),
    description: z.string().nullable().optional(),
    team: z
        .object({
            id: z.string(),
            type: z.string(),
            summary: z.string().optional(),
            self: z.string().optional(),
            html_url: z.string().optional()
        })
        .nullable()
        .optional(),
    point_of_contact: z.string().nullable().optional(),
    summary: z.string().optional(),
    html_url: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the business service.'),
        name: z.string().describe('The name of the business service.'),
        type: z.string().describe('The type of the object. Always "business_service" for this resource.'),
        self: z.string().optional().describe('The API URL of the business service.'),
        description: z.string().optional().describe('A description of the business service.'),
        team: z
            .object({
                id: z.string().describe('The unique identifier of the associated team.'),
                type: z.string().describe('The type of the associated team object.'),
                summary: z.string().optional().describe('A short summary of the associated team.'),
                self: z.string().optional().describe('The API URL of the associated team.'),
                html_url: z.string().optional().describe('The PagerDuty web URL of the associated team.')
            })
            .nullable()
            .optional()
            .describe('The team associated with the business service, if any.'),
        point_of_contact: z.string().nullable().optional().describe('Contact information for the business service.'),
        summary: z.string().optional().describe('A short summary of the business service.'),
        html_url: z.string().nullable().optional().describe('The PagerDuty web URL of the business service.')
    })
    .describe('A single PagerDuty business service.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single business service from the PagerDuty API.
 */
const action = createAction({
    description: 'Retrieve a single business service.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['services.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.pagerduty.com/api-reference/
        const response = await nango.get({
            endpoint: `/business_services/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const raw = ProviderBusinessServiceSchema.parse(response.data?.business_service);

        return {
            id: raw.id,
            name: raw.name,
            type: raw.type,
            ...(raw.self !== undefined && { self: raw.self }),
            ...(raw.description != null && { description: raw.description }),
            ...(raw.team !== undefined && { team: raw.team }),
            ...(raw.point_of_contact !== undefined && { point_of_contact: raw.point_of_contact }),
            ...(raw.summary !== undefined && { summary: raw.summary }),
            ...(raw.html_url !== undefined && { html_url: raw.html_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
