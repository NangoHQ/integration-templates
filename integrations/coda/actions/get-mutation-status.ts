import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    requestId: z.string().describe('The requestId returned by an async mutation such as page create/update/delete or row upsert. Example: "request-123"')
});

const ProviderResponseSchema = z.object({
    completed: z.boolean()
});

const OutputSchema = z.object({
    completed: z.boolean()
});

const action = createAction({
    description: 'Poll the status of an async mutation (page create/update/delete, row upsert, etc.).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['doc:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://coda.io/developers/apis/v1#tag/Mutations/operation/getMutationStatus
            endpoint: `/mutationStatus/${encodeURIComponent(input.requestId)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            completed: providerResponse.completed
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
