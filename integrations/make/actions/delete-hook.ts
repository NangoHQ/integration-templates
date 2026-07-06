import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    hookId: z.number().describe('Hook ID. Example: 3329468')
});

const ProviderResponseSchema = z.object({
    hook: z.number()
});

const OutputSchema = z.object({
    hook: z.number().describe('ID of the deleted hook')
});

const action = createAction({
    description: 'Delete a webhook.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hooks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.make.com/api-documentation/hooks/delete-hooks-hookid
            endpoint: `/hooks/${encodeURIComponent(input.hookId)}`,
            params: {
                confirmed: 'true'
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            hook: providerResponse.hook
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
