import { z } from 'zod';
import { createAction } from 'nango';

const PresetDesignTypeInputSchema = z.object({
    type: z.literal('preset'),
    name: z.enum(['doc', 'email', 'presentation', 'whiteboard'])
});

const CustomDesignTypeInputSchema = z.object({
    type: z.literal('custom'),
    width: z.number().int().min(40).max(8000),
    height: z.number().int().min(40).max(8000)
});

const DesignTypeInputSchema = z.union([PresetDesignTypeInputSchema, CustomDesignTypeInputSchema]);

const InputSchema = z.object({
    design_id: z.string().describe('The ID of the design to resize. Example: "DAHNACmCy_g"'),
    design_type: DesignTypeInputSchema
});

const ThumbnailSchema = z.object({
    width: z.number().int(),
    height: z.number().int(),
    url: z.string()
});

const DesignLinksSchema = z.object({
    edit_url: z.string(),
    view_url: z.string()
});

const DesignSummarySchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    url: z.string().optional(),
    thumbnail: ThumbnailSchema.optional(),
    urls: DesignLinksSchema,
    created_at: z.number().int(),
    updated_at: z.number().int(),
    page_count: z.number().int().optional()
});

const TrialInformationSchema = z.object({
    uses_remaining: z.number().int(),
    upgrade_url: z.string()
});

const DesignResizeJobResultSchema = z.object({
    design: DesignSummarySchema,
    trial_information: TrialInformationSchema.optional()
});

const DesignResizeErrorSchema = z.object({
    code: z.string(),
    message: z.string()
});

const DesignResizeJobSchema = z.object({
    id: z.string(),
    status: z.enum(['in_progress', 'success', 'failed']),
    result: DesignResizeJobResultSchema.optional(),
    error: DesignResizeErrorSchema.optional()
});

const OutputSchema = z.object({
    job: DesignResizeJobSchema
});

const action = createAction({
    description: 'Start a design resize job.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['design:content:read', 'design:content:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.canva.dev/docs/connect/api-reference/resizes/create-design-resize-job/
            endpoint: '/rest/v1/resizes',
            data: {
                design_id: input.design_id,
                design_type: input.design_type
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
