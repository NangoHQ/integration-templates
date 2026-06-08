import { z } from 'zod';
import { createAction } from 'nango';

const PublicationInputSchema = z.object({
    publicationId: z.string().optional().describe('Publication GID. Example: "gid://shopify/Publication/762454635"'),
    channelId: z.string().optional().describe('Channel GID. Example: "gid://shopify/Channel/762454635"'),
    publishDate: z.string().optional().describe('Publish date in ISO 8601 format. Example: "2024-11-14T11:45:48-05:00"')
});

const InputSchema = z.object({
    id: z.string().describe('Resource GID to unpublish. Example: "gid://shopify/Product/108828309"'),
    input: z.array(PublicationInputSchema).describe('Array of PublicationInput objects specifying publications to unpublish from.')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const OutputSchema = z.object({
    publishable: z.record(z.string(), z.unknown()).optional(),
    userErrors: z.array(UserErrorSchema)
});

const GraphQLResponseSchema = z.object({
    data: z.object({
        publishableUnpublish: z.object({
            publishable: z.record(z.string(), z.unknown()).nullable().optional(),
            userErrors: z.array(UserErrorSchema).optional()
        })
    })
});

const action = createAction({
    description: 'Unpublish a Shopify resource from one or more sales channels.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/unpublish-resource',
        group: 'Publications'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_publications'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/publishableUnpublish
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: `
                    mutation publishableUnpublish($id: ID!, $input: [PublicationInput!]!) {
                        publishableUnpublish(id: $id, input: $input) {
                            publishable {
                                ... on Product {
                                    id
                                }
                                ... on Collection {
                                    id
                                }
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
                    input: input.input
                }
            },
            retries: 1
        });

        const payload = response.data;

        if (payload && typeof payload === 'object' && 'errors' in payload) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'GraphQL mutation returned errors.',
                errors: payload.errors
            });
        }

        const parsed = GraphQLResponseSchema.parse(payload);

        return {
            ...(parsed.data.publishableUnpublish.publishable != null && {
                publishable: parsed.data.publishableUnpublish.publishable
            }),
            userErrors: parsed.data.publishableUnpublish.userErrors ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
