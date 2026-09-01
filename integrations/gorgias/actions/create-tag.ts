import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe("Name of the tag. Tags' names are case sensitive."),
        description: z.string().optional().describe('Short description of the tag.'),
        color: z.string().optional().describe('The color of the tag (Hex color code).')
    })
    .describe('Input for creating a tag.');

const ProviderTagSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    decoration: z
        .object({
            color: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    usage: z.number(),
    uri: z.string(),
    created_datetime: z.string(),
    deleted_datetime: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the tag.'),
        name: z.string().describe('Name of the tag.'),
        description: z.string().optional().describe('Short description of the tag.'),
        color: z.string().optional().describe('The color of the tag (Hex color code).'),
        usage: z.number().describe('Number of tickets this tag is associated with.'),
        uri: z.string().describe('URI of the tag.'),
        created_datetime: z.string().describe('When the tag was created.'),
        deleted_datetime: z.string().optional().describe('When the tag was deleted.')
    })
    .describe('Output of a created tag.');

/**
 * @tags: [write]
 * @tagReason: Creates a new tag on the provider.
 * @pitfalls: The API auto-assigns a random hex color when none is provided, and duplicate tag names cause a 400 error.
 */
const action = createAction({
    description: 'Create a tag.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tags:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.gorgias.com/reference/create-tag
            endpoint: '/api/tags',
            data: {
                name: input.name,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.color !== undefined && { decoration: { color: input.color } })
            },
            retries: 3
        };
        const response = await nango.post(config);

        const providerTag = ProviderTagSchema.parse(response.data);

        return {
            id: providerTag.id,
            name: providerTag.name,
            ...(providerTag.description != null && { description: providerTag.description }),
            ...(providerTag.decoration?.color != null && { color: providerTag.decoration.color }),
            usage: providerTag.usage,
            uri: providerTag.uri,
            created_datetime: providerTag.created_datetime,
            ...(providerTag.deleted_datetime != null && { deleted_datetime: providerTag.deleted_datetime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
