import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the URL redirect to delete. Example: "gid://shopify/UrlRedirect/905192165"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        urlRedirectDelete: z.object({
            deletedUrlRedirectId: z.string().optional().nullable(),
            userErrors: z.array(
                z.object({
                    field: z.array(z.string()).optional(),
                    message: z.string()
                })
            )
        })
    })
});

const OutputSchema = z.object({
    deletedUrlRedirectId: z.string().optional(),
    userErrors: z.array(
        z.object({
            field: z.array(z.string()).optional(),
            message: z.string()
        })
    )
});

const action = createAction({
    description: 'Delete a URL redirect from a Shopify store.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-url-redirect',
        group: 'URL Redirects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_online_store_navigation'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://shopify.dev/docs/api/admin-graphql/2025-07/mutations/urlRedirectDelete
        const response = await nango.post({
            endpoint: '/admin/api/2025-07/graphql.json',
            data: {
                query: `
                    mutation UrlRedirectDelete($id: ID!) {
                        urlRedirectDelete(id: $id) {
                            deletedUrlRedirectId
                            userErrors {
                                field
                                message
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

        const parsed = ProviderResponseSchema.parse(response.data);
        const result = parsed.data.urlRedirectDelete;

        return {
            ...(result.deletedUrlRedirectId != null && { deletedUrlRedirectId: result.deletedUrlRedirectId }),
            userErrors: result.userErrors.map((error) => ({
                ...(error.field != null && { field: error.field }),
                message: error.message
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
