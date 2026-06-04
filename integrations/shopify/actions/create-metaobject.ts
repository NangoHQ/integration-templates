import { z } from 'zod';
import { createAction } from 'nango';

const MetaobjectFieldInputSchema = z.object({
    key: z.string(),
    value: z.string()
});

const InputSchema = z.object({
    type: z.string().describe('The type of the metaobject. Must match an existing metaobject definition type.'),
    handle: z.string().optional().describe('A unique handle for the metaobject. Auto-generated when omitted.'),
    fields: z.array(MetaobjectFieldInputSchema).optional().describe('Values for fields mapped by key to the metaobject definition.')
});

const MetaobjectFieldSchema = z.object({
    key: z.string(),
    value: z.string().nullable(),
    type: z.string()
});

const MetaobjectSchema = z.object({
    id: z.string(),
    type: z.string(),
    handle: z.string(),
    displayName: z.string(),
    fields: z.array(MetaobjectFieldSchema)
});

const GraphQLErrorSchema = z.object({
    message: z.string(),
    extensions: z.object({}).passthrough().optional()
});

const MetaobjectCreateResultSchema = z.object({
    metaobject: MetaobjectSchema.nullable().optional(),
    userErrors: z
        .array(
            z.object({
                field: z.array(z.string()),
                message: z.string(),
                code: z.string()
            })
        )
        .optional()
});

const MetaobjectCreatePayloadSchema = z.object({
    data: z
        .object({
            metaobjectCreate: MetaobjectCreateResultSchema.nullable().optional()
        })
        .nullable()
        .optional(),
    errors: z.array(GraphQLErrorSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    handle: z.string(),
    displayName: z.string(),
    fields: z.array(
        z.object({
            key: z.string(),
            value: z.string().optional(),
            type: z.string()
        })
    )
});

const action = createAction({
    description: 'Create a Shopify metaobject entry.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-metaobject',
        group: 'Metaobjects'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_metaobjects'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation MetaobjectCreate($metaobject: MetaobjectCreateInput!) {
                metaobjectCreate(metaobject: $metaobject) {
                    metaobject {
                        id
                        type
                        handle
                        displayName
                        fields {
                            key
                            value
                            type
                        }
                    }
                    userErrors {
                        field
                        message
                        code
                    }
                }
            }
        `;

        const variables = {
            metaobject: {
                type: input.type,
                ...(input.handle !== undefined && { handle: input.handle }),
                ...(input.fields !== undefined && { fields: input.fields })
            }
        };

        // https://shopify.dev/docs/api/admin-graphql/2025-04/mutations/metaobjectCreate
        const response = await nango.post({
            endpoint: '/admin/api/2025-04/graphql.json',
            data: {
                query,
                variables
            },
            retries: 1
        });

        const parsed = MetaobjectCreatePayloadSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Unexpected response from Shopify API',
                details: parsed.error.issues
            });
        }

        const payload = parsed.data;

        if (payload.errors && payload.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: payload.errors.map((err) => err.message).join(', '),
                errors: payload.errors
            });
        }

        const result = payload.data?.metaobjectCreate;
        if (!result) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Metaobject creation result missing from response'
            });
        }

        if (result.userErrors && result.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: result.userErrors.map((err) => err.message).join(', '),
                errors: result.userErrors
            });
        }

        const metaobject = result.metaobject;
        if (!metaobject) {
            throw new nango.ActionError({
                type: 'not_created',
                message: 'Metaobject was not created'
            });
        }

        return {
            id: metaobject.id,
            type: metaobject.type,
            handle: metaobject.handle,
            displayName: metaobject.displayName,
            fields: metaobject.fields.map((field) => ({
                key: field.key,
                ...(field.value !== null && { value: field.value }),
                type: field.type
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
