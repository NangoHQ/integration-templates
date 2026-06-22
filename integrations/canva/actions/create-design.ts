import { z } from 'zod';
import { createAction } from 'nango';

const PresetDesignTypeInputSchema = z.object({
    type: z.literal('preset'),
    name: z.enum(['doc', 'email', 'presentation', 'whiteboard']).describe('The preset design type name. Example: "presentation"')
});

const CustomDesignTypeInputSchema = z.object({
    type: z.literal('custom'),
    width: z.number().int().min(40).max(8000).describe('The width of the design in pixels. Example: 1920'),
    height: z.number().int().min(40).max(8000).describe('The height of the design in pixels. Example: 1080')
});

const DesignTypeInputSchema = z.union([PresetDesignTypeInputSchema, CustomDesignTypeInputSchema]);

const InputSchema = z.object({
    design_type: DesignTypeInputSchema.describe('The design type, either a preset or custom dimensions'),
    asset_id: z
        .string()
        .optional()
        .describe('The ID of an asset to insert into the created design. Currently only supports image assets. Example: "MAHNAIYJM-w"'),
    title: z.string().min(1).max(255).optional().describe('The name of the design. Example: "My Holiday Presentation"')
});

const TeamUserSummarySchema = z.object({
    user_id: z.string(),
    team_id: z.string()
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

const DesignSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    owner: TeamUserSummarySchema,
    thumbnail: ThumbnailSchema.optional(),
    urls: DesignLinksSchema,
    created_at: z.number().int(),
    updated_at: z.number().int(),
    page_count: z.number().int().optional()
});

const OutputSchema = z.object({
    design: DesignSchema
});

const action = createAction({
    description: 'Create a design from a preset design type or custom dimensions',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['design:content:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: {
            type: 'type_and_asset';
            design_type: { type: 'preset'; name: string } | { type: 'custom'; width: number; height: number };
            asset_id?: string;
            title?: string;
        } = {
            type: 'type_and_asset',
            design_type: input.design_type,
            ...(input.asset_id !== undefined && { asset_id: input.asset_id }),
            ...(input.title !== undefined && { title: input.title })
        };

        // https://www.canva.dev/docs/connect/api-reference/designs/create-design/
        const response = await nango.post({
            endpoint: '/rest/v1/designs',
            data: requestBody,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Received an invalid response from the Canva API'
            });
        }

        const parsed = OutputSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Response did not match expected schema',
                errors: parsed.error.issues
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
