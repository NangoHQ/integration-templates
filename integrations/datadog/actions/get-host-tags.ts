import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    hostname: z.string().describe('The hostname to retrieve tags for. Example: "Victors-MacBook-Pro.local"')
});

const ProviderResponseSchema = z.object({
    host: z.string().optional().nullable(),
    tags: z.array(z.string()).optional().nullable(),
    source: z.string().optional().nullable()
});

const OutputSchema = z.object({
    host: z.string().optional().describe('The hostname.'),
    tags: z.array(z.string()).describe('Tags assigned to the host.'),
    source: z.string().optional().describe('Source of the tags, e.g. "Datadog Agent", "users", "aws" etc.')
});

const action = createAction({
    description: 'Get tags assigned to a specific host.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/tags/#get-host-tags
            endpoint: `v1/tags/hosts/${encodeURIComponent(input.hostname)}`,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerData.host != null && { host: providerData.host }),
            tags: providerData.tags ?? [],
            ...(providerData.source != null && { source: providerData.source })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
