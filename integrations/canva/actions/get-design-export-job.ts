import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    exportId: z.string().describe('The export job ID. Example: "e08861ae-3b29-45db-8dc1-1fe0bf7f1cc8"')
});

const ExportErrorSchema = z.object({
    code: z.enum(['license_required', 'approval_required', 'internal_failure']),
    message: z.string()
});

const ExportJobSchema = z.object({
    id: z.string(),
    status: z.enum(['failed', 'in_progress', 'success']),
    urls: z.array(z.string()).optional(),
    error: ExportErrorSchema.optional()
});

const OutputSchema = z.object({
    job: ExportJobSchema
});

const action = createAction({
    description: 'Retrieve export job status/result and download URLs.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['design:content:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.canva.dev/docs/connect/api-reference/exports/get-design-export-job/
            endpoint: `/rest/v1/exports/${encodeURIComponent(input.exportId)}`,
            retries: 3
        });

        const providerResponse = OutputSchema.parse(response.data);

        return {
            job: providerResponse.job
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
