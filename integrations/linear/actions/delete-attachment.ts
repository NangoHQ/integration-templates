import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    attachmentId: z.string().describe('The identifier of the attachment to delete. Example: "f4485af5-5d5a-4baf-bb8f-d66cbf7254c8"')
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            attachmentDelete: z
                .object({
                    success: z.boolean(),
                    lastSyncId: z.number().optional()
                })
                .optional()
        })
        .nullable()
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string(),
                extensions: z
                    .object({
                        code: z.string().optional()
                    })
                    .optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    attachmentId: z.string().optional()
});

const action = createAction({
    description: 'Delete an attachment from a Linear issue.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-attachment',
        group: 'Attachments'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://linear.app/developers/attachments
            endpoint: '/graphql',
            data: {
                query: `
                    mutation AttachmentDelete($id: String!) {
                        attachmentDelete(id: $id) {
                            success
                            lastSyncId
                        }
                    }
                `,
                variables: {
                    id: input.attachmentId
                }
            },
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected empty response from provider.'
            });
        }

        const body = GraphQLResponseSchema.parse(response.data);

        const firstError = body.errors?.find(() => true);
        if (firstError) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: firstError.message,
                code: firstError.extensions?.code
            });
        }

        if (!body.data?.attachmentDelete?.success) {
            throw new nango.ActionError({
                type: 'deletion_failed',
                message: 'Attachment deletion was not successful.',
                attachmentId: input.attachmentId
            });
        }

        return {
            success: body.data.attachmentDelete.success,
            attachmentId: input.attachmentId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
