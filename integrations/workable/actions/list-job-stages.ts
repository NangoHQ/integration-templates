import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    shortcode: z.string().describe('The job\'s shortcode. Example: "9CD658E13E"')
});

const ProviderStageSchema = z.object({
    id: z.number(),
    identifier: z.string(),
    slug: z.string(),
    name: z.string(),
    kind: z.string(),
    position: z.number()
});

const ProviderResponseSchema = z.object({
    stages: z.array(ProviderStageSchema)
});

const OutputSchema = z.object({
    stages: z.array(
        z.object({
            slug: z.string(),
            name: z.string(),
            kind: z.string(),
            position: z.number()
        })
    )
});

const action = createAction({
    description: 'List the pipeline stages configured for a specific job.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_jobs'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://workable.readme.io/reference/job-stages
            endpoint: `/spi/v3/jobs/${encodeURIComponent(input.shortcode)}/stages`,
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            stages: providerResponse.stages.map((stage) => ({
                slug: stage.slug,
                name: stage.name,
                kind: stage.kind,
                position: stage.position
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
