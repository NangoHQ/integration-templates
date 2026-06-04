import { createSync } from 'nango';
import { z } from 'zod';

const QuantitySchema = z.object({
    name: z.string(),
    quantity: z.number().int()
});

const InventoryLevelSchema = z.object({
    id: z.string(),
    inventoryItemId: z.string(),
    locationId: z.string(),
    quantities: z.array(QuantitySchema).optional()
});

const LocationsResponseSchema = z.object({
    data: z.object({
        locations: z.object({
            nodes: z.array(
                z.object({
                    id: z.string()
                })
            ),
            pageInfo: z.object({
                hasNextPage: z.boolean(),
                endCursor: z.string().nullable().optional()
            })
        })
    }),
    errors: z.array(z.unknown()).optional()
});

const InventoryLevelsResponseSchema = z.object({
    data: z.object({
        location: z
            .object({
                inventoryLevels: z.object({
                    nodes: z.array(
                        z.object({
                            id: z.string(),
                            item: z.object({
                                id: z.string()
                            }),
                            quantities: z.array(
                                z.object({
                                    name: z.string(),
                                    quantity: z.number().int()
                                })
                            )
                        })
                    ),
                    pageInfo: z.object({
                        hasNextPage: z.boolean(),
                        endCursor: z.string().nullable().optional()
                    })
                })
            })
            .nullable()
            .optional()
    }),
    errors: z.array(z.unknown()).optional()
});

const CheckpointSchema = z.object({
    location_id: z.string(),
    inventory_level_cursor: z.string()
});

const sync = createSync({
    description: 'Sync Shopify inventory quantities across all locations.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        InventoryLevel: InventoryLevelSchema
    },
    endpoints: [
        {
            path: '/syncs/inventory-levels',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { location_id: '', inventory_level_cursor: '' });
        let locationsCursor: string | undefined;
        const locationIds: string[] = [];

        await nango.trackDeletesStart('InventoryLevel');

        do {
            const locationsResponse = await nango.post({
                // https://shopify.dev/docs/api/admin-graphql/2024-10/queries/locations
                endpoint: '/admin/api/2024-10/graphql.json',
                data: {
                    query: `
                        query Locations($first: Int!, $after: String) {
                            locations(first: $first, after: $after) {
                                nodes {
                                    id
                                }
                                pageInfo {
                                    hasNextPage
                                    endCursor
                                }
                            }
                        }
                    `,
                    variables: {
                        first: 250,
                        after: locationsCursor ?? null
                    }
                },
                retries: 3
            });

            const locationsParsed = LocationsResponseSchema.safeParse(locationsResponse.data);
            if (!locationsParsed.success) {
                throw new Error(`Failed to parse locations response: ${locationsParsed.error.message}`);
            }

            if (locationsParsed.data.errors && locationsParsed.data.errors.length > 0) {
                throw new Error(`GraphQL errors: ${JSON.stringify(locationsParsed.data.errors)}`);
            }

            const locations = locationsParsed.data.data.locations;
            for (const node of locations.nodes) {
                locationIds.push(node.id);
            }

            locationsCursor = locations.pageInfo.hasNextPage ? (locations.pageInfo.endCursor ?? undefined) : undefined;
        } while (locationsCursor !== undefined);

        const startLocationIndex = checkpoint.location_id ? Math.max(locationIds.indexOf(checkpoint.location_id), 0) : 0;

        for (let index = startLocationIndex; index < locationIds.length; index++) {
            const locationId = locationIds[index];
            if (!locationId) {
                continue;
            }

            let hasNextPage = true;
            let cursor: string | undefined = index === startLocationIndex ? checkpoint.inventory_level_cursor || undefined : undefined;

            while (hasNextPage) {
                const response = await nango.post({
                    // https://shopify.dev/docs/api/admin-graphql/2024-10/objects/InventoryLevel
                    endpoint: '/admin/api/2024-10/graphql.json',
                    data: {
                        query: `
                            query InventoryLevels($locationId: ID!, $first: Int!, $after: String) {
                                location(id: $locationId) {
                                    inventoryLevels(first: $first, after: $after) {
                                        nodes {
                                            id
                                            item {
                                                id
                                            }
                                            quantities(names: ["available","incoming","committed","damaged","on_hand","quality_control","reserved","safety_stock"]) {
                                                name
                                                quantity
                                            }
                                        }
                                        pageInfo {
                                            hasNextPage
                                            endCursor
                                        }
                                    }
                                }
                            }
                        `,
                        variables: {
                            locationId,
                            first: 5,
                            after: cursor ?? null
                        }
                    },
                    retries: 3
                });

                const parsed = InventoryLevelsResponseSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error(`Failed to parse inventoryLevels response: ${parsed.error.message}`);
                }

                if (parsed.data.errors && parsed.data.errors.length > 0) {
                    throw new Error(`GraphQL errors: ${JSON.stringify(parsed.data.errors)}`);
                }

                const location = parsed.data.data.location;
                if (!location) {
                    break;
                }

                const inventoryLevels = location.inventoryLevels;
                const levels = inventoryLevels.nodes.map((node) => ({
                    id: node.id,
                    inventoryItemId: node.item.id,
                    locationId,
                    quantities: node.quantities
                }));

                if (levels.length > 0) {
                    await nango.batchSave(levels, 'InventoryLevel');
                }

                hasNextPage = inventoryLevels.pageInfo.hasNextPage;
                cursor = inventoryLevels.pageInfo.endCursor ?? undefined;

                const nextCursor = cursor;
                if (hasNextPage && nextCursor) {
                    await nango.saveCheckpoint({
                        location_id: locationId,
                        inventory_level_cursor: nextCursor
                    });
                }
            }

            const nextLocationId = locationIds[index + 1];
            if (nextLocationId) {
                await nango.saveCheckpoint({
                    location_id: nextLocationId,
                    inventory_level_cursor: ''
                });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('InventoryLevel');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
