import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    issueId: z.string().describe('ID of the issue to attach to. Example: "6948bf28-149d-489b-8f0d-eebae9be8324"'),
    title: z.string().describe('Title of the attachment. Example: "Design Mockup"'),
    url: z.string().describe('URL of the attachment. Example: "https://example.com/mockup.png"'),
    subtitle: z.string().optional().describe('Optional subtitle of the attachment.'),
    metadata: z.record(z.string(), z.unknown()).optional().describe('Optional JSON metadata for the attachment.'),
    iconUrl: z.string().optional().describe('Optional URL of the attachment icon.'),
    groupBySource: z.boolean().optional().describe('Whether to group the attachment by its source.'),
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
    title: z.string().nullable().optional(),
    subtitle: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    metadata: z.unknown().nullable().optional(),
    sourceType: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
    issue: z
        .object({
            id: z.string()
        })
        .nullable()
        .optional()
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            attachmentCreate: z
                .object({
                    success: z.boolean(),
                    attachment: ProviderAttachmentSchema.nullable().optional()
                })
                .nullable()
                .optional()
        })
        .nullable()
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    url: z.string().optional(),
    metadata: z.unknown().optional(),
    sourceType: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    issueId: z.string().optional()
});

const action = createAction({
    description: 'Create an attachment on a Linear issue.',
    version: '1.0.4',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['issues:create', 'comments:create'],

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

        const config: ProxyConfiguration = {
            // https://linear.app/developers
            endpoint: '/graphql',
            data: {
                query: `mutation AttachmentCreate($input: AttachmentCreateInput!) {
                    attachmentCreate(input: $input) {
                        success
                        attachment {
                            id
                            title
                            subtitle
                            url
                            metadata
                            sourceType
                            createdAt
                            updatedAt
                            issue {
                                id
                            }
                        }
                    }
                }`,
                variables
            },
            retries: 3
        };

        const response = await nango.post(config);

        if (
            response.data &&
            typeof response.data === 'object' &&
            'errors' in response.data &&
            Array.isArray(response.data.errors) &&
            response.data.errors.length > 0
        ) {
            const firstError = response.data.errors[0];
            throw new nango.ActionError({
                type: 'graphql_error',
                message:
                    typeof firstError === 'object' && firstError !== null && 'message' in firstError && typeof firstError.message === 'string'
                        ? firstError.message
                        : 'GraphQL error',
                errors: response.data.errors
            });
        }

        const parsedResult = ProviderResponseSchema.safeParse(response.data);
        if (!parsedResult.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Linear API.',
                details: parsedResult.error.issues
            });
        }

        const providerResponse = parsedResult.data;
        const attachmentCreate = providerResponse.data?.attachmentCreate;

        if (!attachmentCreate || !attachmentCreate.success || !attachmentCreate.attachment) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'Attachment creation was not successful.'
            });
        }

        const attachment = attachmentCreate.attachment;

        return {
            id: attachment.id,
            success: attachmentCreate.success,
            ...(attachment.title != null && { title: attachment.title }),
            ...(attachment.subtitle != null && { subtitle: attachment.subtitle }),
            ...(attachment.url != null && { url: attachment.url }),
            ...(attachment.metadata != null && { metadata: attachment.metadata }),
            ...(attachment.sourceType != null && { sourceType: attachment.sourceType }),
            ...(attachment.createdAt != null && { createdAt: attachment.createdAt }),
            ...(attachment.updatedAt != null && { updatedAt: attachment.updatedAt }),
            ...(attachment.issue != null && { issueId: attachment.issue.id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
