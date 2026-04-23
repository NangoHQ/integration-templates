import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    attachmentId: z.string().describe('Attachment ID. Example: "47e14163-404c-4a34-b775-5c536d67760a"')
});

const IssueSchema = z.object({
    id: z.string(),
    identifier: z.string(),
    title: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.union([z.string(), z.null()]),
    subtitle: z.union([z.string(), z.null()]),
    url: z.string(),
    sourceType: z.union([z.string(), z.null()]),
    metadata: z.union([z.record(z.string(), z.unknown()), z.null()]),
    source: z.union([z.record(z.string(), z.unknown()), z.null()]),
    issue: z.union([IssueSchema, z.null()])
});

const action = createAction({
    description: 'Retrieve a Linear attachment by attachment ID.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-attachment',
        group: 'Attachments'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://linear.app/developers/attachments
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: `
                    query GetAttachment($id: String!) {
                        attachment(id: $id) {
                            id
                            title
                            subtitle
                            url
                            sourceType
                            metadata
                            source
                            issue {
                                id
                                identifier
                                title
                            }
                        }
                    }
                `,
                variables: {
                    id: input.attachmentId
                }
            },
            retries: 3
        });

        const attachmentData = response.data.data?.attachment;

        if (!attachmentData) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Attachment not found with ID: ${input.attachmentId}`
            });
        }

        return {
            id: attachmentData.id,
            title: attachmentData.title,
            subtitle: attachmentData.subtitle,
            url: attachmentData.url,
            sourceType: attachmentData.sourceType,
            metadata: attachmentData.metadata,
            source: attachmentData.source,
            issue: attachmentData.issue
                ? {
                      id: attachmentData.issue.id,
                      identifier: attachmentData.issue.identifier,
                      title: attachmentData.issue.title
                  }
                : null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
