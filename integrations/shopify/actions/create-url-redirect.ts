import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    path: z.string().describe('The old path to be redirected from. Example: "/old-path"'),
    target: z.string().describe('The target location where the user will be redirected to. Example: "/new-path"')
});

const UrlRedirectSchema = z.object({
    id: z.string(),
    path: z.string(),
    target: z.string()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const OutputSchema = z.object({
    urlRedirect: UrlRedirectSchema.optional(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Create a URL redirect in a Shopify store.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-url-redirect',
        group: 'URL Redirects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_content'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-rest/2025-10/resources/redirect#post-redirects
            endpoint: 'admin/api/2025-10/redirects.json',
            data: {
                redirect: {
                    path: input.path,
                    target: input.target
                }
            },
            retries: 10
        });

        const responseData = z
            .object({
                redirect: z
                    .object({
                        id: z.coerce.string(),
                        path: z.string(),
                        target: z.string()
                    })
                    .optional(),
                errors: z.record(z.string(), z.unknown()).optional()
            })
            .parse(response.data);

        if (responseData.errors) {
            const userErrors: Array<{ field?: string[]; message: string }> = [];
            for (const [key, value] of Object.entries(responseData.errors)) {
                if (Array.isArray(value)) {
                    for (const msg of value) {
                        if (typeof msg === 'string') {
                            userErrors.push({
                                ...(key !== 'base' && { field: [key] }),
                                message: msg
                            });
                        }
                    }
                } else if (typeof value === 'string') {
                    userErrors.push({
                        ...(key !== 'base' && { field: [key] }),
                        message: value
                    });
                }
            }

            return {
                urlRedirect: undefined,
                userErrors
            };
        }

        if (!responseData.redirect) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Shopify: missing redirect data.'
            });
        }

        return {
            urlRedirect: {
                id: String(responseData.redirect.id),
                path: responseData.redirect.path,
                target: responseData.redirect.target
            },
            userErrors: []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
