import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    team_id: z.string().describe('Team ID. Example: "1639747348117609063"'),
    cursor: z.string().regex(/^\d+$/).optional().describe('Pagination cursor from the previous response (numeric). Omit for the first page.'),
    page_size: z.number().int().positive().max(1000).optional().describe('Number of items to return per page. Defaults to 30. Maximum of 1000.')
});

const UserSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    handle: z.string().optional(),
    img_url: z.string().optional(),
    name: z.string().optional()
});

const FrameInfoSchema = z.object({
    node_id: z.string().optional(),
    name: z.string().optional(),
    page_id: z.string().optional(),
    page_name: z.string().optional()
});

const ComponentSchema = z.object({
    key: z.string(),
    file_key: z.string(),
    node_id: z.string(),
    thumbnail_url: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    user: UserSchema.optional(),
    containing_frame: FrameInfoSchema.optional()
});

const ProviderResponseSchema = z.object({
    meta: z.object({
        components: z.array(ComponentSchema),
        cursor: z
            .object({
                before: z.number().optional(),
                after: z.number().optional()
            })
            .optional()
    })
});

const OutputSchema = z.object({
    components: z.array(ComponentSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List components from Figma.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['team_library_content:read', 'files:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.figma.com/developers/api#get-team-components-endpoint
            endpoint: `/v1/teams/${encodeURIComponent(input.team_id)}/components`,
            params: {
                ...(input.page_size !== undefined && { page_size: input.page_size }),
                ...(input.cursor !== undefined && { after: input.cursor })
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            components: providerData.meta.components,
            ...(providerData.meta.cursor?.after !== undefined && {
                next_cursor: String(providerData.meta.cursor.after)
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
