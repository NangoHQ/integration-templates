import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Attachment ID. Example: "47e14163-404c-4a34-b775-5c536d67760a"')
});

const IssueSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    title: z.string()
});

const UserSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional()
});

const ExternalUserSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    email: z.string().optional()
});

const ProviderAttachmentSchema = z.object({
    id: z.string(),
    title: z.string(),
    subtitle: z.string().nullable().optional(),
    url: z.string(),
    source: z.record(z.string(), z.unknown()).nullable().optional(),
    sourceType: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()),
    groupBySource: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
    archivedAt: z.string().nullable().optional(),
    bodyData: z.string().nullable().optional(),
    issue: IssueSchema,
    originalIssue: IssueSchema.nullable().optional(),
    creator: UserSchema.nullable().optional(),
    externalUserCreator: ExternalUserSchema.nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    subtitle: z.string().optional(),
    url: z.string(),
    source: z.record(z.string(), z.unknown()).optional(),
    sourceType: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()),
    groupBySource: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
    archivedAt: z.string().optional(),
    bodyData: z.string().optional(),
    issue: z.object({
        id: z.string(),
        identifier: z.string(),
        title: z.string()
    }),
    originalIssue: z
        .object({
            id: z.string(),
            identifier: z.string(),
            title: z.string()
        })
        .optional(),
    creator: z
        .object({
            id: z.string(),
            name: z.string().optional(),
            email: z.string().optional()
        })
        .optional(),
    externalUserCreator: z
        .object({
            id: z.string(),
            name: z.string().optional(),
            email: z.string().optional()
        })
        .optional()
});

const GraphQLErrorSchema = z.object({
    message: z.string(),
    extensions: z.record(z.string(), z.unknown()).optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            attachment: ProviderAttachmentSchema.nullable()
        })
        .nullable(),
    errors: z.array(GraphQLErrorSchema).optional()
});

const action = createAction({
    description: 'Retrieve a Linear attachment by attachment ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-attachment',
        group: 'Attachments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers
            endpoint: '/graphql',
            data: {
                query: `
                    query GetAttachment($id: String!) {
                        attachment(id: $id) {
                            id
                            title
                            subtitle
                            url
                            source
                            sourceType
                            metadata
                            groupBySource
                            createdAt
                            updatedAt
                            archivedAt
                            bodyData
                            issue {
                                id
                                identifier
                                title
                            }
                            originalIssue {
                                id
                                identifier
                                title
                            }
                            creator {
                                id
                                name
                                email
                            }
                            externalUserCreator {
                                id
                                name
                                email
                            }
                        }
                    }
                `,
                variables: {
                    id: input.id
                }
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'missing_response',
                message: 'Provider returned an empty response.'
            });
        }

        const payload = GraphQLResponseSchema.parse(response.data);

        const firstError = payload.errors?.[0];
        if (firstError) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: firstError.message,
                errors: payload.errors
            });
        }

        if (!payload.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Attachment with id "${input.id}" was not found.`
            });
        }

        const attachment = payload.data.attachment;
        if (!attachment) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Attachment with id "${input.id}" was not found.`
            });
        }

        return {
            id: attachment.id,
            title: attachment.title,
            ...(attachment.subtitle != null && { subtitle: attachment.subtitle }),
            url: attachment.url,
            ...(attachment.source != null && { source: attachment.source }),
            ...(attachment.sourceType != null && { sourceType: attachment.sourceType }),
            metadata: attachment.metadata,
            groupBySource: attachment.groupBySource,
            createdAt: attachment.createdAt,
            updatedAt: attachment.updatedAt,
            ...(attachment.archivedAt != null && { archivedAt: attachment.archivedAt }),
            ...(attachment.bodyData != null && { bodyData: attachment.bodyData }),
            issue: {
                id: attachment.issue.id,
                identifier: attachment.issue.identifier,
                title: attachment.issue.title
            },
            ...(attachment.originalIssue != null && {
                originalIssue: {
                    id: attachment.originalIssue.id,
                    identifier: attachment.originalIssue.identifier,
                    title: attachment.originalIssue.title
                }
            }),
            ...(attachment.creator != null && {
                creator: {
                    id: attachment.creator.id,
                    ...(attachment.creator.name != null && { name: attachment.creator.name }),
                    ...(attachment.creator.email != null && { email: attachment.creator.email })
                }
            }),
            ...(attachment.externalUserCreator != null && {
                externalUserCreator: {
                    id: attachment.externalUserCreator.id,
                    ...(attachment.externalUserCreator.name != null && { name: attachment.externalUserCreator.name }),
                    ...(attachment.externalUserCreator.email != null && { email: attachment.externalUserCreator.email })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
