import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    aliasId: z
        .string()
        .describe(
            'The unique identifier (uid) of the alias to delete. Example: "67fd21f7ea7d41e4157079a107237f7f1e5ecf7aa01e567a98c495a4f3865ff36da4f8ee93a0e1d652371cdb1daea17ff36c1a851aec70a6d0bee82639995f18"'
        )
});

const ProviderResponseSchema = z.object({
    status: z.string().describe('Deletion status. Example: "SUCCESS"')
});

const OutputSchema = z.object({
    status: z.string().describe('Deletion status. Example: "SUCCESS"')
});

const action = createAction({
    description: 'Remove an alias.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://vercel.com/docs/rest-api/reference
            endpoint: `/v2/aliases/${encodeURIComponent(input.aliasId)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            status: providerResponse.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
