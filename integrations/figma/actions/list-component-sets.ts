import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    team_id: z.string().describe('Figma team ID. Example: "1639747348117609063"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Maps to the after query parameter. Omit for the first page.'),
    page_size: z.number().int().positive().max(1000).optional().describe('Number of items per page. Default: 30. Maximum: 1000.')
});

const UserSchema = z.object({
    id: z.string(),
    handle: z.string(),
    img_url: z.string(),
    email: z.string().optional()
});

const FrameInfoSchema = z.object({
    node_id: z.string().optional(),
    name: z.string().optional(),
    backgroundColor: z.string().optional(),
    pageId: z.string().optional(),
    pageName: z.string().optional(),
    containingStateGroup: z.string().optional(),
    containingComponentSet: z.string().optional()
});

const ComponentSetSchema = z.object({
    key: z.string(),
    file_key: z.string(),
    node_id: z.string(),
    thumbnail_url: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    user: UserSchema.optional(),
    containing_frame: FrameInfoSchema.optional()
});

const CursorSchema = z.object({
    before: z.number().optional(),
    after: z.number().optional()
});

const ProviderResponseSchema = z.object({
    status: z.number(),
    error: z.boolean(),
    meta: z.object({
        component_sets: z.array(ComponentSetSchema),
        cursor: CursorSchema.optional()
    })
});

const OutputSchema = z.object({
    component_sets: z.array(ComponentSetSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List component sets for a Figma team.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['team_library_content:read'],

    exec: async (nango, input) => {
        const config: ProxyConfiguration = {
            // https://www.figma.com/developers/api#GET-team-component-sets-endpoint
            endpoint: `/v1/teams/${encodeURIComponent(input.team_id)}/component_sets`,
            params: {
                ...(input.page_size !== undefined && { page_size: String(input.page_size) }),
                ...(input.cursor !== undefined && { after: input.cursor })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            component_sets: providerResponse.meta.component_sets,
            ...(providerResponse.meta.cursor?.after !== undefined && {
                next_cursor: String(providerResponse.meta.cursor.after)
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
