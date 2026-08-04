import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    hostname: z.string().trim().min(1).describe('The hostname of the host to tag. Example: "my-host.example.com"'),
    tags: z.array(z.string()).describe('List of tags to apply to the host. Example: ["env:staging", "team:backend"]')
});

const ProviderResponseSchema = z
    .object({
        host: z.string().optional(),
        tags: z.array(z.string()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    hostname: z.string(),
    tags: z.array(z.string())
});

const action = createAction({
    description: 'Add tags to a host',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/tags/#add-tags-to-a-host
            endpoint: `v1/tags/hosts/${encodeURIComponent(input.hostname)}`,
            data: {
                tags: input.tags
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            hostname: providerResponse.host || input.hostname,
            tags: providerResponse.tags || input.tags
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
