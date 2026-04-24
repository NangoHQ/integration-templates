import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueId: z
        .string()
        .describe(
            'The issue to associate the attachment with. Can be a UUID or issue identifier (e.g., LIN-123). Example: "590a1127-f98b-49fc-ba74-2df8751c089e"'
        ),
    title: z.string().describe('The attachment title. Example: "Exception"'),
    url: z.string().describe('Attachment location which is also used as a unique identifier for the attachment. Example: "https://example.com/123"'),
    subtitle: z.string().optional().describe('The attachment subtitle. Example: "Open"'),
    iconUrl: z
        .string()
        .optional()
        .describe('An icon url to display with the attachment. Should be of jpg or png format. Example: "https://example.com/icon.png"'),
    metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Attachment metadata object with string and number values. Example: {"exceptionId": "exc-123"}'),
    groupBySource: z.boolean().optional().describe('Indicates if attachments for the same source application should be grouped in the Linear UI.'),
    createAsUser: z
        .string()
        .optional()
        .describe(
            'Create attachment as a user with the provided name. This option is only available to OAuth applications creating attachments in actor=application mode.'
        ),
    commentBody: z.string().optional().describe('Create a linked comment with markdown body.')
});

const ProviderAttachmentSchema = z.object({
    id: z.string(),
    url: z.string(),
    title: z.string(),
    subtitle: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional()
});

const ProviderPayloadSchema = z.object({
    success: z.boolean(),
    attachment: ProviderAttachmentSchema.nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean(),
    title: z.string(),
    url: z.string(),
    subtitle: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Create an attachment on a Linear issue.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-attachment',
        group: 'Attachments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const variables = {
            input: {
                issueId: input.issueId,
                title: input.title,
                url: input.url,
                ...(input.subtitle !== undefined && { subtitle: input.subtitle }),
                ...(input.iconUrl !== undefined && { iconUrl: input.iconUrl }),
                ...(input.metadata !== undefined && { metadata: input.metadata }),
                ...(input.groupBySource !== undefined && { groupBySource: input.groupBySource }),
                ...(input.createAsUser !== undefined && { createAsUser: input.createAsUser }),
                ...(input.commentBody !== undefined && { commentBody: input.commentBody })
            }
        };

        // https://linear.app/developers/attachments
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
                                metadata
                            }
                        }
                    }
                `,
                variables
            },
            retries: 3
        });

        const responseData = z
            .object({
                data: z.object({
                    attachmentCreate: ProviderPayloadSchema
                }),
                errors: z.array(z.unknown()).optional()
            })
            .parse(response.data);

        if (responseData.errors && responseData.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'GraphQL error occurred while creating attachment.',
                errors: responseData.errors
            });
        }

        const payload = responseData.data.attachmentCreate;

        if (!payload.success || !payload.attachment) {
            throw new nango.ActionError({
                type: 'creation_failed',
                message: 'Attachment creation failed or returned no attachment.',
                success: payload.success
            });
        }

        const attachment = payload.attachment;

        return {
            id: attachment.id,
            success: payload.success,
            title: attachment.title,
            url: attachment.url,
            ...(attachment.subtitle != null && { subtitle: attachment.subtitle }),
            ...(attachment.metadata != null && { metadata: attachment.metadata })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
