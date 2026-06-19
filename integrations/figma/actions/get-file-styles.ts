import { z } from 'zod';
import { createAction } from 'nango';

const StyleTypeSchema = z.enum(['FILL', 'TEXT', 'EFFECT', 'GRID']);

const UserSchema = z.object({
    id: z.string(),
    handle: z.string(),
    img_url: z.string()
});

const PublishedStyleSchema = z.object({
    key: z.string(),
    file_key: z.string(),
    node_id: z.string(),
    style_type: StyleTypeSchema,
    thumbnail_url: z.string().optional(),
    name: z.string(),
    description: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    user: UserSchema,
    sort_position: z.string()
});

const InputSchema = z.object({
    file_key: z.string().describe('The unique identifier of the Figma file. Example: "UzYlOaPNPL2c7zmHCEljOs"')
});

const OutputSchema = z.object({
    status: z.number(),
    error: z.boolean(),
    meta: z.object({
        styles: z.array(PublishedStyleSchema)
    })
});

const action = createAction({
    description: 'Retrieve all styles defined within a Figma file.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['library_content:read', 'files:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.figma.com/developers/api#get-file-styles-endpoint
            endpoint: `/v1/files/${encodeURIComponent(input.file_key)}/styles`,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
