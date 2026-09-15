import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: contact-properties/create
// The provider allows at most 50 alphanumeric or underscore characters, and the fallback value must match the declared type.
const KeySchema = z
    .string()
    .max(50)
    .regex(/^[A-Za-z0-9_]+$/, { message: 'Only alphanumeric characters and underscores are allowed' })
    .describe('Property key of up to 50 alphanumeric or underscore characters. Example: "plan"');
const InputSchema = z
    .object({
        body: z.discriminatedUnion('type', [
            z.object({ key: KeySchema, type: z.literal('string'), fallback_value: z.string().optional() }).passthrough(),
            z.object({ key: KeySchema, type: z.literal('number'), fallback_value: z.number().optional() }).passthrough()
        ])
    })
    .passthrough();

const ProviderResponseSchema = z.object({ id: z.string().optional(), object: z.string().optional() }).passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Create a new contact property in Resend.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/contact-properties`,
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- Retrying a non-idempotent POST can duplicate side effects.
            retries: 0,
            data: input.body
        };
        const response = await nango.post(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
