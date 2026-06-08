import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const FileUpdateInputSchema = z.object({
    id: z.string().describe('The globally-unique ID of the file to update. Example: gid://shopify/MediaImage/1234567890'),
    alt: z.string().optional().describe('The alt text description of the file.'),
    filename: z.string().optional().describe('The name of the file including its extension.'),
    originalSource: z.string().optional().describe('The source URL from which to update a media image or generic file.'),
    previewImageSource: z.string().optional().describe('The source URL from which to update the media preview image.'),
    referencesToAdd: z.array(z.string()).optional().describe('The IDs of product references to add to the file.'),
    referencesToRemove: z.array(z.string()).optional().describe('The IDs of product references to remove from the file.')
});

const InputSchema = z.object({
    files: z.array(FileUpdateInputSchema).describe('Array of file update inputs.')
});

const FileSchema = z.object({
    id: z.string(),
    alt: z.string().optional(),
    createdAt: z.string(),
    fileStatus: z.string(),
    updatedAt: z.string()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string(),
    code: z.string().optional()
});

const OutputSchema = z.object({
    files: z.array(FileSchema).optional(),
    userErrors: z.array(UserErrorSchema).optional()
});

const action = createAction({
    description: 'Update metadata for a Shopify file resource.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-file',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_files'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2025-10/mutations/fileUpdate
            endpoint: '/admin/api/2025-10/graphql.json',
            data: {
                query: `
                    mutation fileUpdate($files: [FileUpdateInput!]!) {
                        fileUpdate(files: $files) {
                            files {
                                id
                                alt
                                createdAt
                                fileStatus
                                updatedAt
                            }
                            userErrors {
                                field
                                message
                                code
                            }
                        }
                    }
                `,
                variables: {
                    files: input.files
                }
            },
            retries: 3
        };

        const response = await nango.post(config);

        const payload = z
            .object({
                data: z.object({
                    fileUpdate: z.object({
                        files: z
                            .array(
                                z.object({
                                    id: z.string(),
                                    alt: z.string().nullable().optional(),
                                    createdAt: z.string(),
                                    fileStatus: z.string(),
                                    updatedAt: z.string()
                                })
                            )
                            .optional(),
                        userErrors: z
                            .array(
                                z.object({
                                    field: z.array(z.string()).nullable().optional(),
                                    message: z.string(),
                                    code: z.string().nullable().optional()
                                })
                            )
                            .optional()
                    })
                })
            })
            .parse(response.data);

        const result = payload.data.fileUpdate;

        return {
            ...(result.files != null && {
                files: result.files.map((file) => ({
                    id: file.id,
                    ...(file.alt != null && { alt: file.alt }),
                    createdAt: file.createdAt,
                    fileStatus: file.fileStatus,
                    updatedAt: file.updatedAt
                }))
            }),
            ...(result.userErrors != null && {
                userErrors: result.userErrors.map((error) => ({
                    ...(error.field != null && { field: error.field }),
                    message: error.message,
                    ...(error.code != null && { code: error.code })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
