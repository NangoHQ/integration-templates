import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: emails/share
const InputSchema = z
    .object({
        email_id: z.string(),
        body: z
            .object({
                expires_in: z
                    .string()
                    .optional()
                    .describe('How long the link stays valid, as a duration such as "10m", "2 hours", or "1 day". Defaults to 48h and cannot exceed 48 hours.')
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({ object: z.string().optional(), id: z.string().optional(), url: z.string().optional() }).passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Create a shareable link for a sent or received email in Resend.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/emails/${encodeURIComponent(input['email_id'])}/share`,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- Retrying a non-idempotent POST can duplicate side effects.
            retries: 0,
            ...(input.body !== undefined && { data: input.body })
        };
        const response = await nango.post(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
