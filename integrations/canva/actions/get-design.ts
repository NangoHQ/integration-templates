import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    designId: z.string().describe('The design ID. Example: "DAHNACmCy_g"')
});

const TeamUserSummarySchema = z.object({
    user_id: z.string(),
    team_id: z.string()
});

const ThumbnailSchema = z.object({
    width: z.number(),
    height: z.number(),
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
    created_at: z.number(),
    updated_at: z.number(),
    page_count: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    owner: TeamUserSummarySchema,
    thumbnail: ThumbnailSchema.optional(),
    urls: DesignLinksSchema,
    created_at: z.number(),
    updated_at: z.number(),
    page_count: z.number().optional()
});

const action = createAction({
    description: 'Retrieve design metadata.',
    version: '1.0.0',
    endpoint: {
        path: '/actions/get-design',
        method: 'GET'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['design:meta:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.canva.dev/docs/connect/api-reference/designs/
            endpoint: `/rest/v1/designs/${encodeURIComponent(input.designId)}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || !('design' in response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Design not found or unexpected response structure',
                designId: input.designId
            });
        }

        const providerData = z
            .object({
                design: DesignSchema
            })
            .parse(response.data);

        return providerData.design;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
