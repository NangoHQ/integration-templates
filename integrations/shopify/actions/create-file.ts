import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const FileCreateInputSchema = z.object({
    alt: z.string().optional(),
    contentType: z.string().optional(),
    duplicateResolutionMode: z.string().optional(),
    filename: z.string().optional(),
    originalSource: z.string()
});

const InputSchema = z.object({
    files: z.array(FileCreateInputSchema)
});

const UserErrorSchema = z.object({
    code: z.string().optional(),
    field: z.array(z.string()).optional(),
    message: z.string()
});

const OutputSchema = z.object({
    files: z.array(z.unknown()).optional(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Create a file resource in Shopify after staging an upload',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_files'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/latest/mutations/fileCreate
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `
                    mutation fileCreate($files: [FileCreateInput!]!) {
                        fileCreate(files: $files) {
                            files {
                                id
                                fileStatus
                                alt
                                createdAt
                                updatedAt
                                ... on MediaImage {
                                    image {
                                        url
                                        width
                                        height
                                    }
                                }
                                ... on GenericFile {
                                    url
                                }
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

        const graphqlResponse = z
            .object({
                data: z
                    .object({
                        fileCreate: z.object({
                            files: z.array(z.unknown()).optional(),
                            userErrors: z.array(UserErrorSchema)
                        })
                    })
                    .optional(),
                errors: z.array(z.object({ message: z.string() })).optional()
            })
            .parse(response.data);

        if (graphqlResponse.errors && graphqlResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: graphqlResponse.errors.map((e) => e.message).join(', ')
            });
        }

        if (!graphqlResponse.data) {
            throw new nango.ActionError({
                type: 'missing_data',
                message: 'No data returned from Shopify'
            });
        }

        return {
            files: graphqlResponse.data.fileCreate.files,
            userErrors: graphqlResponse.data.fileCreate.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
