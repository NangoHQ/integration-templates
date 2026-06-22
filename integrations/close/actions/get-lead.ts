import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Lead ID. Example: "lead_mELh8FRqV6vRWJ5bgGdx7GpifIkEnoQFHg0hsxmQI1z"')
});

const OutputSchema = z
    .object({
        id: z.string(),
        display_name: z.string().optional(),
        name: z.string().optional(),
        status_id: z.string().optional(),
        status_label: z.string().optional(),
        organization_id: z.string().optional(),
        date_created: z.string().optional(),
        date_updated: z.string().optional(),
        created_by: z.string().optional(),
        updated_by: z.string().optional(),
        contacts: z.array(z.object({}).passthrough()).optional(),
        opportunities: z.array(z.object({}).passthrough()).optional(),
        tasks: z.array(z.object({}).passthrough()).optional(),
        url: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single Close lead by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['lead:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.close.com/resources/leads/#retrieve-a-single-lead
            endpoint: `/v1/lead/${encodeURIComponent(input.id)}/`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Lead not found',
                id: input.id
            });
        }

        const lead = OutputSchema.parse(response.data);
        return lead;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
