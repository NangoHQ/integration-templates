import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Name of the project. Example: "Nango Registry Test Project"'),
    base_currency: z.string().describe('Base currency of the project in ISO3 format. Example: "USD"'),
    status: z
        .enum(['External Pending', 'Scheduled', 'In Progress', 'Completed', 'On Hold', 'Cancelled', 'Feasibility'])
        .optional()
        .describe('Status of the project. If set to "External Pending", all otherwise-required fields become optional.')
});

const ProviderResponseSchema = z.object({
    id: z.string()
});

const OutputSchema = z.object({
    id: z.string().describe('Global ID of the created project')
});

const action = createAction({
    description: 'Create a new project',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://api.ingenious.build/reference/createprojectpubv2
            endpoint: '/api/v2/pub/projects',
            data: {
                name: input.name,
                base_currency: input.base_currency,
                ...(input.status !== undefined && { status: input.status })
            },
            // No provider-supported idempotency key exists for this endpoint. A single write
            // retry (the same convention used by other Ingenious Build create actions) bounds
            // the risk of creating a duplicate project on a transient failure.
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
