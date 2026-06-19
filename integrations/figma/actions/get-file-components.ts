import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    file_key: z.string().describe('The key of the Figma file to retrieve components from. Example: "UzYlOaPNPL2c7zmHCEljOs"')
});

const UserSchema = z.object({
    id: z.string(),
    handle: z.string(),
    img_url: z.string()
});

const FrameInfoSchema = z.object({
    nodeId: z.string().optional(),
    name: z.string().optional(),
    backgroundColor: z.string().optional(),
    pageId: z.string(),
    pageName: z.string()
});

const ComponentSchema = z.object({
    key: z.string(),
    file_key: z.string(),
    node_id: z.string(),
    thumbnail_url: z.string().optional(),
    name: z.string(),
    description: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    user: UserSchema,
    containing_frame: FrameInfoSchema.optional()
});

const OutputSchema = z.object({
    components: z.array(ComponentSchema)
});

const RawResponseSchema = z.object({
    meta: z.object({
        components: z.array(z.unknown())
    })
});

const action = createAction({
    description: 'Retrieve all components defined within a Figma file.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['library_content:read', 'files:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.figma.com/docs/rest-api/component-endpoints/#get-file-components
            endpoint: `/v1/files/${encodeURIComponent(input.file_key)}/components`,
            retries: 3
        };
        const response = await nango.get(config);

        const raw = RawResponseSchema.parse(response.data);

        return {
            components: raw.meta.components.map((component) => ComponentSchema.parse(component))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
