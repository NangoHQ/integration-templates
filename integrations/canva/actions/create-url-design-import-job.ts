import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    url: z.string().min(1).max(2048).describe('The URL of the file to import. Must be publicly accessible. Example: "https://example.com/presentation.pptx"'),
    title: z.string().min(1).max(255).describe('A title for the imported design. Example: "My Awesome Design"'),
    mime_type: z
        .string()
        .min(1)
        .max(100)
        .optional()
        .describe('The MIME type of the file being imported. Example: "application/vnd.openxmlformats-officedocument.presentationml.presentation"')
});

const DesignSummarySchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    url: z.string().optional(),
    thumbnail: z
        .object({
            width: z.number().optional(),
            height: z.number().optional(),
            url: z.string().optional()
        })
        .optional(),
    urls: z
        .object({
            edit_url: z.string().optional(),
            view_url: z.string().optional()
        })
        .optional(),
    created_at: z.number().optional(),
    updated_at: z.number().optional(),
    page_count: z.number().optional()
});

const DesignImportJobSchema = z.object({
    id: z.string(),
    status: z.enum(['in_progress', 'success', 'failed']),
    result: z
        .object({
            designs: z.array(DesignSummarySchema).optional()
        })
        .optional(),
    error: z
        .object({
            code: z.string(),
            message: z.string()
        })
        .optional()
});

const OutputSchema = z.object({
    job: DesignImportJobSchema
});

const action = createAction({
    description: 'Start a design import job from a source URL.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['portability:import'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            url: input.url,
            title: input.title
        };

        if (input.mime_type !== undefined) {
            requestBody['mime_type'] = input.mime_type;
        }

        const response = await nango.post({
            // https://www.canva.dev/docs/connect/api-reference/design-imports/create-url-import-job/
            endpoint: '/rest/v1/url-imports',
            data: requestBody,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Canva API'
            });
        }

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
