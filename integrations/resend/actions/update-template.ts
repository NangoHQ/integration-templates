import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Contract derived from https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml
// Operation: templates/update
const InputSchema = z
    .object({
        id: z.string(),
        body: z
            .object({
                name: z.string().optional(),
                alias: z.string().optional(),
                from: z.string().optional(),
                subject: z.string().optional(),
                reply_to: z.array(z.string()).optional(),
                html: z.string().optional(),
                text: z.string().optional(),
                variables: z
                    .array(
                        z
                            .object({
                                key: z.string(),
                                type: z.enum(['string', 'number', 'boolean', 'object', 'list']),
                                fallback_value: z.union([z.string(), z.number(), z.boolean(), z.object({}).passthrough(), z.array(z.unknown())]).optional()
                            })
                            .passthrough()
                    )
                    .optional()
            })
            .passthrough()
    })
    .passthrough();

const ProviderResponseSchema = z.object({ id: z.string().optional(), object: z.string().optional() }).passthrough();
const OutputSchema = ProviderResponseSchema;

const action = createAction({
    description: 'Update an existing template in Resend.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://raw.githubusercontent.com/resend/resend-openapi/68c1b66c20ad62020962838832e53af10558c2f5/resend.yaml,
            endpoint: `/templates/${encodeURIComponent(input['id'])}`,
            retries: 3,
            data: input.body
        };
        const response = await nango.patch(config);
        const data = ProviderResponseSchema.parse(response.data);
        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
