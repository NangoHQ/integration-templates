import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueId: z.string().describe('The ID of the issue to attach to. Example: "abc123-def456-ghi789"'),
    url: z.string().describe('The URL of the attachment. Example: "https://github.com/org/repo/pull/123"'),
    title: z.string().describe('The title of the attachment. Example: "PR: Feature Implementation"'),
    subtitle: z.string().optional().describe('Optional subtitle for the attachment.'),
    iconUrl: z.string().optional().describe('Optional icon URL for the attachment.'),
    metadata: z.object({}).passthrough().optional().describe('Optional metadata object for the attachment.')
});

const OutputSchema = z.object({
    id: z.string(),
    url: z.string(),
    title: z.string(),
    subtitle: z.string().nullable(),
    iconUrl: z.string().nullable(),
    success: z.boolean()
});

const action = createAction({
    description: 'Create an attachment on a Linear issue',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-attachment',
        group: 'Attachments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:create', 'attachments:create'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.linear.app/docs/graphql/attachments
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    mutation AttachmentCreate($input: AttachmentCreateInput!) {
                        attachmentCreate(input: $input) {
                            success
                            attachment {
                                id
                                url
                                title
                                subtitle
                            }
                        }
                    }
                `,
                variables: {
                    input: {
                        issueId: input.issueId,
                        url: input.url,
                        title: input.title,
                        ...(input.subtitle && { subtitle: input.subtitle }),
                        ...(input.iconUrl && { iconUrl: input.iconUrl }),
                        ...(input.metadata && { metadata: input.metadata })
                    }
                }
            },
            retries: 3
        });

        if (!response.data?.data?.attachmentCreate?.attachment) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'Failed to create attachment',
                response: response.data
            });
        }

        const attachment = response.data.data.attachmentCreate.attachment;
        const success = response.data.data.attachmentCreate.success;

        return {
            id: attachment.id,
            url: attachment.url,
            title: attachment.title,
            subtitle: attachment.subtitle ?? null,
            iconUrl: attachment.iconUrl ?? null,
            success: success ?? false
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
