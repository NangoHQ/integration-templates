import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    pageId: z.string().describe('The ID of the page to restore from trash. Example: "12345678-1234-1234-1234-123456789012"')
});

const ProviderPageSchema = z.object({
    id: z.string(),
    object: z.string(),
    created_time: z.string().optional(),
    last_edited_time: z.string().optional(),
    created_by: z
        .object({
            id: z.string().optional(),
            object: z.string().optional()
        })
        .optional(),
    last_edited_by: z
        .object({
            id: z.string().optional(),
            object: z.string().optional()
        })
        .optional(),
    cover: z.unknown().optional(),
    icon: z.unknown().optional(),
    parent: z.unknown().optional(),
    archived: z.boolean().optional(),
    in_trash: z.boolean().optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
    url: z.string().optional(),
    public_url: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    object: z.string(),
    createdTime: z.string().optional(),
    lastEditedTime: z.string().optional(),
    archived: z.boolean().optional(),
    inTrash: z.boolean().optional(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Restore a page from trash so it returns to active workspace views.',
    version: '2.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/restore-page',
        group: 'Pages'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.notion.com/reference/update-page
        const response = await nango.patch({
            endpoint: `/v1/pages/${encodeURIComponent(input.pageId)}`,
            data: {
                in_trash: false
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Page not found or could not be restored',
                pageId: input.pageId
            });
        }

        const providerPage = ProviderPageSchema.parse(response.data);

        return {
            id: providerPage.id,
            object: providerPage.object,
            ...(providerPage.created_time && { createdTime: providerPage.created_time }),
            ...(providerPage.last_edited_time && { lastEditedTime: providerPage.last_edited_time }),
            ...(providerPage.archived !== undefined && { archived: providerPage.archived }),
            ...(providerPage.in_trash !== undefined && { inTrash: providerPage.in_trash }),
            ...(providerPage.url && { url: providerPage.url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
