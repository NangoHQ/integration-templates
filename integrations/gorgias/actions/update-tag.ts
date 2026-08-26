import { z } from 'zod';
import { createAction } from 'nango';

const TagDecorationSchema = z.object({
    color: z.string().describe('The color of the tag (hex color code). Example: "#F58D86".')
});

const InputSchema = z
    .object({
        id: z.number().describe('The ID of the tag to update. Example: 1814124.'),
        name: z.string().max(256).optional().describe('New name for the tag. Tag names are case sensitive.'),
        description: z.string().max(1024).optional().describe('New short description for the tag.'),
        decoration: TagDecorationSchema.optional().describe('New decoration for the tag. If provided, color is required.')
    })
    .describe('Input for updating an existing Gorgias tag.');

const ProviderTagSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    decoration: z.object({
        color: z.string()
    }),
    usage: z.number(),
    uri: z.string(),
    created_datetime: z.string(),
    deleted_datetime: z.string().nullable()
});

const OutputSchema = z
    .object({
        id: z.number().describe('The ID of the updated tag.'),
        name: z.string().describe('The name of the updated tag.'),
        description: z.string().optional().describe('The description of the updated tag.'),
        decoration: z
            .object({
                color: z.string().describe('The color of the tag (hex color code).')
            })
            .describe('The decoration of the updated tag.'),
        usage: z.number().describe('The number of tickets associated with this tag.'),
        uri: z.string().describe('The URI of the updated tag.'),
        created_datetime: z.string().describe('When the tag was created.'),
        deleted_datetime: z.string().optional().describe('When the tag was deleted, if applicable.')
    })
    .describe('The updated Gorgias tag.');

/**
 * @tags: [write]
 * @tagReason: Mutates an existing tag on the provider by renaming it or changing its decoration or description.
 * @pitfalls: Tag names are case sensitive; the API stores decoration color hex codes in lowercase.
 */
const action = createAction({
    description: 'Rename a tag or change its decoration or description.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: { name?: string; description?: string; decoration?: z.infer<typeof TagDecorationSchema> } = {};

        if (input.name !== undefined) {
            body.name = input.name;
        }
        if (input.description !== undefined) {
            body.description = input.description;
        }
        if (input.decoration !== undefined) {
            body.decoration = input.decoration;
        }

        const response = await nango.put({
            // https://developers.gorgias.com/reference/update-tag
            endpoint: `/api/tags/${encodeURIComponent(input.id)}`,
            data: body,
            retries: 3
        });

        const providerTag = ProviderTagSchema.parse(response.data);

        return {
            id: providerTag.id,
            name: providerTag.name,
            ...(providerTag.description != null && { description: providerTag.description }),
            decoration: providerTag.decoration,
            usage: providerTag.usage,
            uri: providerTag.uri,
            created_datetime: providerTag.created_datetime,
            ...(providerTag.deleted_datetime != null && { deleted_datetime: providerTag.deleted_datetime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
