import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    model: z.string().describe('The fine-tuned model ID to delete. Example: ft:gpt-4o-mini:acme:custom:abc123')
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    object: z.literal('model'),
    deleted: z.boolean()
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.literal('model'),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete a fine-tuned model owned by the organization.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-model',
        group: 'Models'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['model.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://platform.openai.com/docs/api-reference/models/delete
        const response = await nango.delete({
            endpoint: `/v1/models/${encodeURIComponent(input.model)}`,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            id: providerData.id,
            object: providerData.object,
            deleted: providerData.deleted
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
