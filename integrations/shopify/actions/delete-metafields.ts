import { z } from 'zod';
import { createAction } from 'nango';

const MetafieldIdentifierInputSchema = z.object({
    ownerId: z.string().describe('The globally unique ID of the resource that owns the metafield. Example: "gid://shopify/Product/1234567890"'),
    namespace: z.string().describe('The namespace of the metafield. Example: "custom"'),
    key: z.string().describe('The key of the metafield. Example: "warranty_info"')
});

const InputSchema = z.object({
    metafields: z.array(MetafieldIdentifierInputSchema).min(1).describe('A list of metafield identifiers to delete. At least one identifier is required.')
});

const DeletedMetafieldSchema = z.object({
    key: z.string(),
    namespace: z.string(),
    ownerId: z.string()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()),
    message: z.string()
});

const OutputSchema = z.object({
    deletedMetafields: z.array(DeletedMetafieldSchema).optional(),
    userErrors: z.array(UserErrorSchema).optional()
});

const GraphQLResponseSchema = z.object({
    data: z.object({
        metafieldsDelete: z.object({
            deletedMetafields: z.array(DeletedMetafieldSchema.nullable()),
            userErrors: z.array(UserErrorSchema)
        })
    }),
    errors: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'Delete Shopify metafields in one call.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-metafields',
        group: 'Metafields'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation MetafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {
                metafieldsDelete(metafields: $metafields) {
                    deletedMetafields {
                        key
                        namespace
                        ownerId
                    }
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/metafieldsDelete
        const response = await nango.post({
            endpoint: '/admin/api/2026-04/graphql.json',
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
                message: 'GraphQL errors occurred while deleting metafields.',
                errors: body.errors
            });
        }

        const payload = body.data.metafieldsDelete;
        const deletedMetafields = payload.deletedMetafields
            .filter((m) => m !== null)
            .map((m) => ({
                key: m.key,
                namespace: m.namespace,
                ownerId: m.ownerId
            }));

        return {
            ...(deletedMetafields.length > 0 && { deletedMetafields }),
            ...(payload.userErrors.length > 0 && { userErrors: payload.userErrors })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
