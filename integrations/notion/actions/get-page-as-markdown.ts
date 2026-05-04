import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page_id: z.string().describe('The ID of the page to retrieve as markdown. Example: "b55c9c91-384d-452b-81db-d1ef79372b75"'),
    include_transcript: z.boolean().optional().describe('Include meeting note transcripts (default: false)')
});

const ProviderPageMarkdownSchema = z.object({
    object: z.literal('page_markdown'),
    id: z.string(),
    markdown: z.string(),
    truncated: z.boolean(),
    unknown_block_ids: z.array(z.string())
});

const OutputSchema = z.object({
    id: z.string(),
    markdown: z.string(),
    truncated: z.boolean(),
    unknown_block_ids: z.array(z.string())
});

const action = createAction({
    description: 'Retrieve a page in the current markdown export format if available.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-page-as-markdown',
        group: 'Pages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_content'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.notion.com/reference/retrieve-page-markdown
        const response = await nango.get({
            endpoint: `/v1/pages/${encodeURIComponent(input.page_id)}/markdown`,
            params: {
                ...(input.include_transcript !== undefined && { include_transcript: input.include_transcript.toString() })
            },
            headers: {
                'Notion-Version': '2026-03-11'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Page not found or markdown not available',
                page_id: input.page_id
            });
        }

        const pageMarkdown = ProviderPageMarkdownSchema.parse(response.data);

        return {
            id: pageMarkdown.id,
            markdown: pageMarkdown.markdown,
            truncated: pageMarkdown.truncated,
            unknown_block_ids: pageMarkdown.unknown_block_ids
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
