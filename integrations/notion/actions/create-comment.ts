import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    parent: z.object({
        page_id: z.string()
            .describe('Page ID to add comment to. Example: "2b6ce298-3121-80ae-bfe1-f8984b993639"')
    }).describe('Parent page for the comment.'),
    rich_text: z.array(z.any())
        .describe('Comment content as rich text array.'),
    discussion_id: z.string().optional()
        .describe('Discussion thread ID to reply to.')
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    created_time: z.string(),
    rich_text: z.array(z.any())
});

const action = createAction({
    description: 'Adds a comment to a page or existing discussion thread.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/comments',
        group: 'Comments'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.notion.com/reference/create-comment
            endpoint: 'v1/comments',
            data: {
                parent: input.parent,
                rich_text: input.rich_text,
                ...(input.discussion_id && { discussion_id: input.discussion_id })
            },
            retries: 3
        };

        const response = await nango.post(config);
        const data = response.data;

        return {
            id: data.id,
            object: data.object,
            created_time: data.created_time,
            rich_text: data.rich_text
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
