import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    response_id: z.string().describe('The ID of the response to delete. Example: "resp_abc123"')
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    object: z.string(),
    deleted: z.boolean()
});

const OutputSchema = z.object({
    id: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete a stored OpenAI response',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-response',
        group: 'Responses'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['model.request'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://platform.openai.com/docs/api-reference/responses/delete
            endpoint: `/v1/responses/${encodeURIComponent(input.response_id)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id,
            deleted: providerResponse.deleted
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
