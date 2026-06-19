import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    jobId: z.string().describe('The ID of the design import job. Example: "e80335c7-afa5-4608-a815-4865c11d0025"')
});

const DesignImportErrorSchema = z.object({
    code: z.string(),
    message: z.string()
});

const DesignSummarySchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    url: z.string().optional(),
    thumbnail: z
        .object({
            width: z.number(),
            height: z.number(),
            url: z.string()
        })
        .optional(),
    urls: z
        .object({
            edit_url: z.string(),
            view_url: z.string()
        })
        .optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    page_count: z.number().optional()
});

const DesignImportJobResultSchema = z.object({
    designs: z.array(DesignSummarySchema).optional()
});

const DesignImportJobSchema = z.object({
    id: z.string(),
    status: z.enum(['failed', 'in_progress', 'success']),
    result: DesignImportJobResultSchema.optional(),
    error: DesignImportErrorSchema.optional()
});

const OutputSchema = z.object({
    job: DesignImportJobSchema
});

const action = createAction({
    description: 'Retrieve design import job status/result.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['portability:import'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.canva.dev/docs/connect/api-reference/design-imports/get-design-import-job/
            endpoint: `/rest/v1/imports/${encodeURIComponent(input.jobId)}`,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
