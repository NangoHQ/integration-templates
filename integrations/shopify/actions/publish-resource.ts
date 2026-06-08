import { z } from 'zod';
import { createAction } from 'nango';

const PublicationInputSchema = z.object({
    publicationId: z.string().describe('ID of the publication. Example: "gid://shopify/Publication/762454635"'),
    publishDate: z.string().optional().describe('The date and time that the resource was published. Example: "2026-01-01T00:00:00Z"')
});

const InputSchema = z.object({
    id: z.string().describe('The resource GID to publish. Example: "gid://shopify/Product/558169081"'),
    input: z.array(PublicationInputSchema).describe('Array of PublicationInput objects')
});

const ProviderResponseSchema = z.object({
    data: z
        .object({
            publishablePublish: z
                .object({
                    publishable: z
                        .object({
                            id: z.string().optional(),
                            title: z.string().optional(),
                            availablePublicationsCount: z
                                .object({
                                    count: z.number().optional()
                                })
                                .optional(),
                            resourcePublicationsCount: z
                                .object({
                                    count: z.number().optional()
                                })
                                .optional()
                        })
                        .optional(),
                    userErrors: z.array(
                        z.object({
                            field: z.array(z.string()).optional(),
                            message: z.string().optional()
                        })
                    )
                })
                .optional()
        })
        .optional(),
    errors: z
        .array(
            z.object({
                message: z.string()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    resource: z
        .object({
            id: z.string().optional(),
            title: z.string().optional(),
            availablePublicationsCount: z
                .object({
                    count: z.number().optional()
                })
                .optional(),
            resourcePublicationsCount: z
                .object({
                    count: z.number().optional()
                })
                .optional()
        })
        .optional(),
    userErrors: z.array(
        z.object({
            field: z.array(z.string()).optional(),
            message: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'Publish a Shopify resource to one or more sales channels.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/publish-resource',
        group: 'Publications'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_publications'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
                publishablePublish(id: $id, input: $input) {
                    publishable {
                        availablePublicationsCount {
                            count
                        }
                        resourcePublicationsCount {
                            count
                        }
                        ... on Product {
                            id
                            title
                        }
                        ... on Collection {
                            id
                            title
                        }

                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/latest/mutations/publishablePublish
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: mutation,
                variables: {
                    id: input.id,
                    input: input.input
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            const firstError = providerResponse.errors[0];
            if (firstError) {
                throw new nango.ActionError({
                    type: 'graphql_error',
                    message: firstError.message
                });
            }
        }

        const payload = providerResponse.data?.publishablePublish;

        if (!payload) {
            throw new nango.ActionError({
                type: 'missing_payload',
                message: 'Unexpected response from Shopify GraphQL API'
            });
        }

        return {
            resource: payload.publishable
                ? {
                      id: payload.publishable.id,
                      ...(payload.publishable.title != null && {
                          title: payload.publishable.title
                      }),
                      ...(payload.publishable.availablePublicationsCount != null && {
                          availablePublicationsCount: payload.publishable.availablePublicationsCount
                      }),
                      ...(payload.publishable.resourcePublicationsCount != null && {
                          resourcePublicationsCount: payload.publishable.resourcePublicationsCount
                      })
                  }
                : undefined,
            userErrors: payload.userErrors.map((error) => ({
                ...(error.field != null && { field: error.field }),
                ...(error.message != null && { message: error.message })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
