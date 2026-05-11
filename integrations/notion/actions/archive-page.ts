import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page_id: z.string().describe('Notion page ID to archive. Example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"')
});

const ProviderPageSchema = z.object({
    id: z.string(),
    archived: z.boolean(),
    in_trash: z.boolean().optional(),
    url: z.string().optional(),
    created_time: z.string().optional(),
    last_edited_time: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    archived: z.boolean(),
    in_trash: z.boolean().optional(),
    url: z.string().optional(),
    created_time: z.string().optional(),
    last_edited_time: z.string().optional()
});

const action = createAction({
    description: 'Archive a page so it is removed from active workspace views.',
    version: '2.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/archive-page',
        group: 'Pages'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const pageId = input.page_id;

        // https://developers.notion.com/reference/patch-page
        const response = await nango.patch({
            endpoint: `/v1/pages/${encodeURIComponent(pageId)}`,
            data: {
                archived: true
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Page not found',
                page_id: pageId
            });
        }

        const providerPage = ProviderPageSchema.parse(response.data);

        return {
            id: providerPage.id,
            archived: providerPage.archived,
            ...(providerPage.in_trash !== undefined && { in_trash: providerPage.in_trash }),
            ...(providerPage.url !== undefined && { url: providerPage.url }),
            ...(providerPage.created_time !== undefined && { created_time: providerPage.created_time }),
            ...(providerPage.last_edited_time !== undefined && { last_edited_time: providerPage.last_edited_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
