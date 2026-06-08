import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    fileIds: z.array(z.string()).describe('Array of Shopify file GIDs to delete. Example: ["gid://shopify/MediaImage/123"]')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).nullable().optional(),
    message: z.string(),
    code: z.string().nullable().optional()
});

const OutputSchema = z.object({
    deletedFileIds: z.array(z.string()).nullable().optional(),
    userErrors: z.array(UserErrorSchema).nullable().optional()
});

const FileDeleteResponseSchema = z.object({
    data: z.object({
        fileDelete: z.object({
            deletedFileIds: z.array(z.string()).nullable().optional(),
            userErrors: z.array(UserErrorSchema).nullable().optional()
        })
    })
});

const action = createAction({
    description: 'Delete one or more Shopify file resources.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-files',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_files'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/latest/mutations/fileDelete
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `
                    mutation fileDelete($fileIds: [ID!]!) {
                        fileDelete(fileIds: $fileIds) {
                            deletedFileIds
                            userErrors {
                                field
                                message
                                code
                            }
                        }
                    }
                `,
                variables: {
                    fileIds: input.fileIds
                }
            },
            retries: 1
        };

        const response = await nango.post(config);

        const parsed = FileDeleteResponseSchema.parse(response.data);
        const result = parsed.data.fileDelete;

        return {
            ...(result.deletedFileIds !== undefined && result.deletedFileIds !== null && { deletedFileIds: result.deletedFileIds }),
            ...(result.userErrors !== undefined && result.userErrors !== null && { userErrors: result.userErrors })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
