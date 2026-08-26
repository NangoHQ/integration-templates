import { z } from 'zod';
import { createAction } from 'nango';

const TagDecorationSchema = z.object({
    color: z.string().optional().describe('The hex color code of the tag. Example: "#F58D86"')
});

const InputSchema = z
    .object({
        destination_tag_id: z.number().describe('The ID of the tag that will serve as the base for the merge. Example: 123'),
        source_tags_ids: z.array(z.number()).describe('IDs of the tags that will be merged into the destination tag. Example: [456, 789]')
    })
    .describe('Input parameters for merging one or more source tags into a destination tag.');

const OutputSchema = z
    .object({
        id: z.number().describe('ID of the tag. Example: 123456'),
        name: z.string().describe('Name of the tag. Tags\' names are case sensitive. Example: "urgent"'),
        description: z.string().describe('Short description of the tag. Example: "Mark a ticket as urgent"'),
        usage: z.number().describe('Number of tickets this tag is associated with. Example: 123'),
        uri: z.string().describe('URI of the tag. Example: "/api/tags/5/"'),
        created_datetime: z.string().describe('When the tag was created. Example: "2019-07-05T14:42:00.384938"'),
        deleted_datetime: z.string().nullable().describe('When the tag was deleted. Example: "2019-07-05T14:42:00.384938"'),
        decoration: TagDecorationSchema.describe('Information related to the style of the tag.')
    })
    .describe('The destination tag after the merge operation.');

/**
 * @tags: [write, destructive]
 * @tagReason: Merges source tags into a destination tag and permanently deletes the source tags.
 * @pitfalls: Source tags are permanently deleted and their usage is transferred to the destination tag; this operation is irreversible.
 */
const action = createAction({
    description: 'Merge one or more source tags into a destination tag.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tags:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.gorgias.com/reference/merge-tags
            endpoint: `/api/tags/${encodeURIComponent(input.destination_tag_id)}/merge`,
            data: {
                source_tags_ids: input.source_tags_ids
            },
            retries: 3
        });

        const tag = OutputSchema.parse(response.data);
        return tag;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
