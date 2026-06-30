import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).describe('Name of the lead list to create. Example: "My Lead List"')
});

const ProviderResponseSchema = z.object({
    id: z.string().describe('Lead list ID. Example: "019f1a0f-1a3c-7828-801d-069c4b11cf00"'),
    name: z.string().describe('Lead list name.'),
    organization_id: z.string().describe('Workspace organization ID.'),
    timestamp_created: z.string().describe('ISO 8601 creation timestamp.')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    organization_id: z.string(),
    timestamp_created: z.string()
});

const action = createAction({
    description: 'Create a lead list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    endpoint: {
        method: 'POST',
        path: '/actions/create-lead-list'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.instantly.ai/api-reference/groups/lead-list
        const response = await nango.post({
            endpoint: '/v2/lead-lists',
            data: {
                name: input.name
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.safeParse(response.data);

        if (!providerData.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The provider returned an unexpected response format.',
                details: providerData.error.flatten()
            });
        }

        return {
            id: providerData.data.id,
            name: providerData.data.name,
            organization_id: providerData.data.organization_id,
            timestamp_created: providerData.data.timestamp_created
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
