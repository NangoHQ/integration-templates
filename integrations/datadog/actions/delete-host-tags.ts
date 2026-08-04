import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    hostname: z.string().trim().min(1).describe('The name of the host to remove all tags from. Example: "Victors-MacBook-Pro.local"')
});

const OutputSchema = z.object({
    hostname: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Remove all tags from a host',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['host_tags_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/tags/#remove-host-tags
            endpoint: `v1/tags/hosts/${encodeURIComponent(input.hostname)}`,
            retries: 3
        };

        await nango.delete(config);

        return {
            hostname: input.hostname,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
