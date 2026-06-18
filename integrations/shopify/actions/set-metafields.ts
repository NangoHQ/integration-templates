import { z } from 'zod';
import { createAction } from 'nango';

const MetafieldSetInputSchema = z.object({
    key: z.string().describe('The unique key for the metafield. Example: "materials"'),
    namespace: z.string().describe('The namespace for the metafield. Example: "my_fields"'),
    ownerId: z.string().describe('The global ID of the resource that owns the metafield. Example: "gid://shopify/Product/20995642"'),
    type: z.string().describe('The metafield type. Example: "single_line_text_field"'),
    value: z.string().describe('The value of the metafield.'),
    compareDigest: z.string().nullable().optional().describe('Optional compare digest for atomic updates. Set to null for new metafields.')
});

const InputSchema = z.object({
    metafields: z.array(MetafieldSetInputSchema).min(1).max(25).describe('List of metafields to set. Maximum of 25.')
});

const ProviderMetafieldSchema = z.object({
    key: z.string(),
    namespace: z.string(),
    value: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    compareDigest: z.string().optional()
});

const ProviderUserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string(),
    code: z.string().optional()
});

const GraphQLResponseSchema = z.object({
    data: z
        .object({
            metafieldsSet: z.object({
                metafields: z.array(ProviderMetafieldSchema).optional(),
                userErrors: z.array(ProviderUserErrorSchema)
            })
        })
        .nullable()
        .optional(),
    errors: z.array(z.record(z.string(), z.unknown())).optional()
});

const OutputMetafieldSchema = z.object({
    key: z.string(),
    namespace: z.string(),
    value: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    compare_digest: z.string().optional()
});

const OutputUserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string(),
    code: z.string().optional()
});

const OutputSchema = z.object({
    metafields: z.array(OutputMetafieldSchema),
    user_errors: z.array(OutputUserErrorSchema)
});

const action = createAction({
    description: 'Create or update Shopify metafields in one call.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_products', 'write_products'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
                metafieldsSet(metafields: $metafields) {
                    metafields {
                        key
                        namespace
                        value
                        createdAt
                        updatedAt
                        compareDigest
                    }
                    userErrors {
                        field
                        message
                        code
                    }
                }
            }
        `;

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2026-01/mutations/metafieldsSet
            endpoint: '/admin/api/2026-01/graphql.json',
            data: {
                query,
                variables: {
                    metafields: input.metafields
                }
            },
            retries: 3
        });

        const body = GraphQLResponseSchema.parse(response.data);

        if (body.errors && body.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'Shopify GraphQL returned top-level errors.',
                errors: body.errors
            });
        }

        if (!body.data || !body.data.metafieldsSet) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Shopify GraphQL API.'
            });
        }

        const payload = body.data.metafieldsSet;

        if (payload.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: 'Shopify returned errors while setting metafields.',
                errors: payload.userErrors
            });
        }

        const metafields = (payload.metafields || []).map((mf) => ({
            key: mf.key,
            namespace: mf.namespace,
            value: mf.value,
            ...(mf.createdAt !== undefined && { created_at: mf.createdAt }),
            ...(mf.updatedAt !== undefined && { updated_at: mf.updatedAt }),
            ...(mf.compareDigest !== undefined && { compare_digest: mf.compareDigest })
        }));

        return {
            metafields,
            user_errors: []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
