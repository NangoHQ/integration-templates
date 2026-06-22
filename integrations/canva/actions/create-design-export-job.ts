import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    design_id: z.string().describe('The design ID. Example: "DAHNACmCy_g"'),
    format: z
        .object({
            type: z.string().describe('Export format type. Example: "pdf", "png", "jpg", "pptx", "gif", "mp4", "html_bundle", "html_standalone"')
        })
        .passthrough()
        .describe('Export format details including type and format-specific options.')
});

const ProviderExportJobSchema = z.object({
    id: z.string(),
    status: z.string(),
    urls: z.array(z.string()).optional(),
    error: z
        .object({
            code: z.string(),
            message: z.string()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    job: ProviderExportJobSchema
});

const OutputSchema = z.object({
    job: z.object({
        id: z.string(),
        status: z.string(),
        urls: z.array(z.string()).optional(),
        error: z
            .object({
                code: z.string(),
                message: z.string()
            })
            .optional()
    })
});

const action = createAction({
    description: 'Create an export job for a design.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['design:content:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://www.canva.dev/docs/connect/api-reference/exports/create-design-export-job/
            endpoint: '/rest/v1/exports',
            data: {
                design_id: input.design_id,
                format: input.format
            },
            retries: 3
        };
        const response = await nango.post(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            job: {
                id: providerResponse.job.id,
                status: providerResponse.job.status,
                ...(providerResponse.job.urls !== undefined && { urls: providerResponse.job.urls }),
                ...(providerResponse.job.error !== undefined && { error: providerResponse.job.error })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
