import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    designId: z.string().describe('Design ID. Example: "DAHNACmCy_g"')
});

const ProviderResponseSchema = z
    .object({
        formats: z
            .object({
                pdf: z.object({}).optional(),
                jpg: z.object({}).optional(),
                png: z.object({}).optional(),
                svg: z.object({}).optional(),
                pptx: z.object({}).optional(),
                gif: z.object({}).optional(),
                mp4: z.object({}).optional(),
                html_bundle: z.object({}).optional(),
                html_standalone: z.object({}).optional()
            })
            .passthrough()
    })
    .passthrough();

const OutputSchema = z.object({
    formats: z.array(z.string())
});

const action = createAction({
    description: 'List export formats available for a design.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['design:content:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://www.canva.dev/docs/connect/api-reference/designs/get-design-export-formats/
            endpoint: `/rest/v1/designs/${encodeURIComponent(input.designId)}/export-formats`,
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            formats: Object.keys(providerResponse.formats)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
