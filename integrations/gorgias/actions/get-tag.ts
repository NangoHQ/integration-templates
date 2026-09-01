import { createAction } from 'nango';
import { z } from 'zod';

const inputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the tag to retrieve.')
    })
    .describe('Input for retrieving a single tag by its ID.');

const providerTagSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        description: z.string().nullable(),
        usage: z.number(),
        uri: z.string(),
        created_datetime: z.string(),
        deleted_datetime: z.string().nullable(),
        decoration: z
            .object({
                color: z.string().optional()
            })
            .nullable()
    })
    .passthrough();

const outputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the tag.'),
        name: z.string().describe('The name of the tag. Tag names are case sensitive.'),
        description: z.string().optional().describe('A short description of the tag, if any.'),
        usage: z.number().describe('The number of tickets this tag is associated with.'),
        uri: z.string().describe('The API URI of the tag resource.'),
        created_datetime: z.string().describe('The ISO 8601 datetime when the tag was created.'),
        deleted_datetime: z.string().nullable().describe('The ISO 8601 datetime when the tag was deleted, or null if the tag is still active.'),
        decoration: z
            .object({
                color: z.string().optional().describe('The hex color code of the tag decoration.')
            })
            .nullable()
            .describe('Visual decoration settings for the tag, or null if none.')
    })
    .describe('A tag retrieved from the Gorgias API.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single tag by its ID from the Gorgias API.
 */
const action = createAction({
    description: 'Retrieve a single tag.',
    version: '1.0.0',
    input: inputSchema,
    output: outputSchema,
    scopes: ['tags:read'],

    exec: async (nango, input): Promise<z.infer<typeof outputSchema>> => {
        // https://developers.gorgias.com/reference/get-tag
        const response = await nango.get({
            endpoint: `/api/tags/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        const providerTag = providerTagSchema.parse(response.data);

        return {
            id: providerTag.id,
            name: providerTag.name,
            ...(providerTag.description != null && { description: providerTag.description }),
            usage: providerTag.usage,
            uri: providerTag.uri,
            created_datetime: providerTag.created_datetime,
            deleted_datetime: providerTag.deleted_datetime,
            decoration: providerTag.decoration
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
