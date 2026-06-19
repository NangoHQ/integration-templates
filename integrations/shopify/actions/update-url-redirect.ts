import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the URL redirect to update. Example: "gid://shopify/UrlRedirect/1234567890"'),
    path: z.string().optional().describe('The old path to be redirected from.'),
    target: z.string().optional().describe('The target location where the user will be redirected to.')
});

const UrlRedirectSchema = z.object({
    id: z.string(),
    path: z.string(),
    target: z.string()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).nullable().optional(),
    message: z.string(),
    code: z.string().nullable().optional()
});

const OutputSchema = z.object({
    urlRedirect: UrlRedirectSchema.optional(),
    userErrors: z.array(
        z.object({
            field: z.array(z.string()).optional(),
            message: z.string()
        })
    )
});

const action = createAction({
    description: 'Update a URL redirect in a Shopify store.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_online_store_navigation', 'write_online_store_navigation'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2025-07/mutations/urlRedirectUpdate
            endpoint: '/admin/api/2025-07/graphql.json',
            data: {
                query: `
                    mutation UrlRedirectUpdate($id: ID!, $urlRedirect: UrlRedirectInput!) {
                        urlRedirectUpdate(id: $id, urlRedirect: $urlRedirect) {
                            urlRedirect {
                                id
                                path
                                target
                            }
                            userErrors {
                                field
                                message
                            }
                        }
                    }
                `,
                variables: {
                    id: input.id,
                    urlRedirect: {
                        ...(input.path !== undefined && { path: input.path }),
                        ...(input.target !== undefined && { target: input.target })
                    }
                }
            },
            retries: 1
        };

        const response = await nango.post(config);

        const PayloadSchema = z.object({
            data: z.object({
                urlRedirectUpdate: z.object({
                    urlRedirect: UrlRedirectSchema.nullable().optional(),
                    userErrors: z.array(UserErrorSchema)
                })
            })
        });

        const parsed = PayloadSchema.parse(response.data);
        const result = parsed.data.urlRedirectUpdate;

        return {
            ...(result.urlRedirect != null && { urlRedirect: result.urlRedirect }),
            userErrors: result.userErrors.map((err) => ({
                ...(err.field != null && { field: err.field }),
                message: err.message
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
