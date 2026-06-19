import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    type: z.string().describe('The type of the metaobject. Example: "test_item"'),
    handle: z.string().describe('The unique handle of the metaobject. Example: "test-item-001"')
});

const FieldSchema = z.object({
    key: z.string(),
    type: z.string(),
    value: z.string().optional(),
    jsonValue: z.unknown().optional()
});

const CapabilitiesSchema = z.object({
    publishable: z
        .object({
            status: z.string().optional()
        })
        .optional(),
    onlineStore: z
        .object({
            templateSuffix: z.string().optional()
        })
        .optional()
});

const MetadataSchema = z.object({
    id: z.string(),
    handle: z.string(),
    type: z.string(),
    displayName: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const OutputSchema = z.object({
    metadata: MetadataSchema,
    capabilities: CapabilitiesSchema,
    fields: z.array(FieldSchema)
});

const action = createAction({
    description: 'Retrieve a Shopify metaobject by type and handle.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_metaobjects'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            query MetaobjectByHandle($type: String!, $handle: String!) {
                metaobjectByHandle(handle: {type: $type, handle: $handle}) {
                    id
                    handle
                    type
                    displayName
                    createdAt
                    updatedAt
                    capabilities {
                        publishable {
                            status
                        }
                        onlineStore {
                            templateSuffix
                        }
                    }
                    fields {
                        key
                        type
                        value
                        jsonValue
                    }
                }
            }
        `;

        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/latest/queries/metaobjectByHandle
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query,
                variables: {
                    type: input.type,
                    handle: input.handle
                }
            },
            retries: 3
        };

        const response = await nango.post(config);

        const payload = z
            .object({
                data: z.object({
                    metaobjectByHandle: z.unknown().nullable()
                })
            })
            .parse(response.data);

        const metaobject = payload.data.metaobjectByHandle;

        if (metaobject === null || metaobject === undefined) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Metaobject not found for type '${input.type}' and handle '${input.handle}'`
            });
        }

        const providerMetaobject = z
            .object({
                id: z.string(),
                handle: z.string(),
                type: z.string(),
                displayName: z.string().optional(),
                createdAt: z.string().optional(),
                updatedAt: z.string().optional(),
                capabilities: z
                    .object({
                        publishable: z
                            .object({
                                status: z.string().optional()
                            })
                            .nullable()
                            .optional(),
                        onlineStore: z
                            .object({
                                templateSuffix: z.string().optional()
                            })
                            .nullable()
                            .optional()
                    })
                    .nullable()
                    .optional(),
                fields: z
                    .array(
                        z.object({
                            key: z.string(),
                            type: z.string(),
                            value: z.string().optional(),
                            jsonValue: z.unknown().optional()
                        })
                    )
                    .nullable()
                    .optional()
            })
            .parse(metaobject);

        const capabilities = providerMetaobject.capabilities;
        const normalizedCapabilities: z.infer<typeof CapabilitiesSchema> = {};

        if (capabilities != null) {
            if (capabilities.publishable != null) {
                normalizedCapabilities.publishable = {
                    ...(capabilities.publishable.status !== undefined && { status: capabilities.publishable.status })
                };
            }
            if (capabilities.onlineStore != null) {
                normalizedCapabilities.onlineStore = {
                    ...(capabilities.onlineStore.templateSuffix !== undefined && { templateSuffix: capabilities.onlineStore.templateSuffix })
                };
            }
        }

        return {
            metadata: {
                id: providerMetaobject.id,
                handle: providerMetaobject.handle,
                type: providerMetaobject.type,
                ...(providerMetaobject.displayName !== undefined && { displayName: providerMetaobject.displayName }),
                ...(providerMetaobject.createdAt !== undefined && { createdAt: providerMetaobject.createdAt }),
                ...(providerMetaobject.updatedAt !== undefined && { updatedAt: providerMetaobject.updatedAt })
            },
            capabilities: normalizedCapabilities,
            fields: providerMetaobject.fields ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
