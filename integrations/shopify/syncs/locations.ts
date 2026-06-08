import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LocationAddressSchema = z.object({
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    country: z.string().optional(),
    zip: z.string().optional(),
    phone: z.string().optional()
});

const LocationSchema = z.object({
    id: z.string(),
    name: z.string(),
    isActive: z.boolean().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    address: LocationAddressSchema.optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const LocationResponseSchema = z.object({
    data: z.object({
        locations: z.object({
            nodes: z.array(
                z.object({
                    id: z.string(),
                    name: z.string(),
                    isActive: z.boolean(),
                    createdAt: z.string(),
                    updatedAt: z.string(),
                    address: z
                        .object({
                            address1: z.string().nullable().optional(),
                            address2: z.string().nullable().optional(),
                            city: z.string().nullable().optional(),
                            province: z.string().nullable().optional(),
                            country: z.string().nullable().optional(),
                            zip: z.string().nullable().optional(),
                            phone: z.string().nullable().optional()
                        })
                        .optional()
                })
            ),
            pageInfo: z.object({
                hasNextPage: z.boolean(),
                endCursor: z.string().nullable().optional()
            })
        })
    })
});

const sync = createSync({
    description: 'Sync Shopify fulfillment and inventory locations',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Location: LocationSchema
    },
    endpoints: [{ method: 'GET', path: '/syncs/locations' }],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let hasNextPage = true;
        let cursor: string | undefined = checkpoint?.cursor;

        while (hasNextPage) {
            const proxyConfig: Omit<ProxyConfiguration, 'method'> = {
                // https://shopify.dev/docs/api/admin-graphql/latest/queries/locations
                endpoint: '/admin/api/2026-04/graphql.json',
                data: {
                    query: `
                        query GetLocations($first: Int!, $after: String) {
                            locations(first: $first, after: $after, includeInactive: true) {
                                nodes {
                                    id
                                    name
                                    isActive
                                    createdAt
                                    updatedAt
                                    address {
                                        address1
                                        address2
                                        city
                                        province
                                        country
                                        zip
                                        phone
                                    }
                                }
                                pageInfo {
                                    hasNextPage
                                    endCursor
                                }
                            }
                        }
                    `,
                    variables: {
                        first: 100,
                        after: cursor
                    }
                },
                retries: 3
            };

            const response = await nango.post(proxyConfig);
            const parsed = LocationResponseSchema.safeParse(response.data);

            if (!parsed.success) {
                throw new Error(`Failed to parse locations response: ${parsed.error.message}`);
            }

            const nodes = parsed.data.data.locations.nodes;
            const pageInfo = parsed.data.data.locations.pageInfo;

            const records = nodes.map((node) => ({
                id: node.id,
                name: node.name,
                isActive: node.isActive,
                createdAt: node.createdAt,
                updatedAt: node.updatedAt,
                ...(node.address && {
                    address: {
                        ...(node.address.address1 != null && { address1: node.address.address1 }),
                        ...(node.address.address2 != null && { address2: node.address.address2 }),
                        ...(node.address.city != null && { city: node.address.city }),
                        ...(node.address.province != null && { province: node.address.province }),
                        ...(node.address.country != null && { country: node.address.country }),
                        ...(node.address.zip != null && { zip: node.address.zip }),
                        ...(node.address.phone != null && { phone: node.address.phone })
                    }
                })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'Location');
            }

            hasNextPage = pageInfo.hasNextPage;
            cursor = pageInfo.endCursor ?? undefined;

            if (hasNextPage && cursor) {
                await nango.saveCheckpoint({ cursor });
            }
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
