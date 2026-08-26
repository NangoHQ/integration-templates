import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('The project ID that contains the Campfire. Example: 48644099'),
        chatId: z.number().describe('The Campfire (chat) ID. Example: 10239340942'),
        cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.')
    })
    .describe('Input for listing file uploads posted in a Campfire');

const ProviderAttachmentSchema = z.object({
    title: z.string(),
    url: z.string(),
    filename: z.string(),
    content_type: z.string(),
    byte_size: z.number(),
    download_url: z.string()
});

const ProviderCreatorSchema = z.object({
    id: z.number(),
    name: z.string()
});

const ProviderUploadSchema = z.object({
    id: z.number(),
    status: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    title: z.string(),
    type: z.string(),
    url: z.string(),
    app_url: z.string(),
    creator: ProviderCreatorSchema,
    attachments: z.array(ProviderAttachmentSchema)
});

const OutputAttachmentSchema = z.object({
    title: z.string().describe('The attachment title'),
    url: z.string().describe('The attachment preview URL'),
    filename: z.string().describe('The original filename'),
    content_type: z.string().describe('The MIME type of the file'),
    byte_size: z.number().describe('The file size in bytes'),
    download_url: z.string().describe('The direct download URL for the file')
});

const OutputCreatorSchema = z.object({
    id: z.number().describe('The creator person ID'),
    name: z.string().describe('The creator name')
});

const OutputUploadSchema = z.object({
    id: z.number().describe('The upload ID'),
    status: z.string().describe('The upload status'),
    created_at: z.string().describe('When the upload was created'),
    updated_at: z.string().describe('When the upload was last updated'),
    title: z.string().describe('The upload title'),
    type: z.string().describe('The upload type'),
    url: z.string().describe('The API URL for the upload'),
    app_url: z.string().describe('The Basecamp app URL for the upload'),
    creator: OutputCreatorSchema.describe('The person who uploaded the file'),
    attachments: z.array(OutputAttachmentSchema).describe('The files attached to this upload line')
});

const OutputSchema = z
    .object({
        items: z.array(OutputUploadSchema).describe('The file uploads on the current page'),
        next_cursor: z.string().optional().describe('The page number for the next page, if more results exist')
    })
    .describe('List of file uploads posted in a Campfire, newest first');

/**
 * @tags: [read]
 * @tagReason: Reads file uploads from a Basecamp Campfire.
 * @pitfalls: The Campfire Chat tool must be enabled on the project; if it is disabled, the call returns a 404.
 */
const action = createAction({
    description: 'List file uploads posted in a Campfire, newest first.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // https://github.com/basecamp/bc3-api/blob/master/sections/campfires.md#get-campfire-uploads
        const response = await nango.get({
            endpoint: `/buckets/${encodeURIComponent(String(input.projectId))}/chats/${encodeURIComponent(String(input.chatId))}/uploads.json`,
            params: {
                ...(input.cursor !== undefined && { page: input.cursor })
            },
            retries: 3
        });

        const parsedData = z.array(ProviderUploadSchema).safeParse(response.data);
        if (!parsedData.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse response from Basecamp API',
                errors: parsedData.error.flatten()
            });
        }

        const items = parsedData.data.map((upload) => ({
            id: upload.id,
            status: upload.status,
            created_at: upload.created_at,
            updated_at: upload.updated_at,
            title: upload.title,
            type: upload.type,
            url: upload.url,
            app_url: upload.app_url,
            creator: {
                id: upload.creator.id,
                name: upload.creator.name
            },
            attachments: upload.attachments.map((attachment) => ({
                title: attachment.title,
                url: attachment.url,
                filename: attachment.filename,
                content_type: attachment.content_type,
                byte_size: attachment.byte_size,
                download_url: attachment.download_url
            }))
        }));

        const rawLink = response.headers['link'];
        const linkHeader = Array.isArray(rawLink) ? rawLink.join(',') : rawLink;
        let next_cursor: string | undefined;
        if (typeof linkHeader === 'string') {
            const parts = linkHeader.split(',');
            for (const part of parts) {
                const match = part.match(/<([^>]+)>;\s*rel="next"/);
                if (match && match[1]) {
                    const nextUrl = new URL(match[1]);
                    const nextPage = nextUrl.searchParams.get('page');
                    if (nextPage) {
                        next_cursor = nextPage;
                    }
                    break;
                }
            }
        }

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
