import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    quantity: z.number().int().describe('Quantity to move. Example: 5'),
    fromLocationId: z.string().describe('Source location ID. Example: gid://shopify/Location/123456789'),
    toLocationId: z.string().describe('Destination location ID. Example: gid://shopify/Location/987654321'),
    inventoryItemId: z.string().describe('Inventory item ID. Example: gid://shopify/InventoryItem/30322695'),
    reason: z.string().optional().describe('Reason for the move. Defaults to "relocation"'),
    referenceDocumentUri: z.string().optional().describe('Reference document URI. Defaults to a generated URI'),
    quantityName: z.string().optional().describe('Quantity name to move. Defaults to "available"')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).nullish(),
    message: z.string(),
    code: z.string().nullish()
});

const InventoryAdjustmentChangeSchema = z.object({
    name: z.string(),
    delta: z.number()
});

const InventoryAdjustmentGroupSchema = z.object({
    createdAt: z.string().nullish(),
    reason: z.string().nullish(),
    referenceDocumentUri: z.string().nullish(),
    changes: z.array(InventoryAdjustmentChangeSchema).nullish()
});

const OutputSchema = z.object({
    userErrors: z.array(UserErrorSchema),
    inventoryAdjustmentGroup: InventoryAdjustmentGroupSchema.nullish()
});

const action = createAction({
    description: 'Move inventory quantities between Shopify locations.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/move-inventory-quantities',
        group: 'Inventory'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_inventory'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const quantityName = input.quantityName ?? 'available';
        const reason = input.reason ?? 'other';
        const referenceDocumentUri = input.referenceDocumentUri ?? `gid://nango/move-inventory-quantities/${Date.now()}`;

        const variables = {
            input: {
                reason,
                referenceDocumentUri,
                changes: [
                    {
                        quantity: input.quantity,
                        inventoryItemId: input.inventoryItemId,
                        from: {
                            locationId: input.fromLocationId,
                            name: quantityName
                        },
                        to: {
                            locationId: input.toLocationId,
                            name: quantityName
                        }
                    }
                ]
            }
        };

        const config: ProxyConfiguration = {
            // https://shopify.dev/docs/api/admin-graphql/2026-01/mutations/inventoryMoveQuantities
            endpoint: 'admin/api/2026-01/graphql.json',
            data: {
                query: 'mutation inventoryMoveQuantities($input: InventoryMoveQuantitiesInput!) { inventoryMoveQuantities(input: $input) { userErrors { field message code } inventoryAdjustmentGroup { createdAt reason referenceDocumentUri changes { name delta } } } }',
                variables
            },
            retries: 10
        };

        const response = await nango.post(config);

        const GraphQLResponseSchema = z.object({
            data: z
                .object({
                    inventoryMoveQuantities: z.object({
                        userErrors: z.array(UserErrorSchema),
                        inventoryAdjustmentGroup: InventoryAdjustmentGroupSchema.nullish()
                    })
                })
                .nullish(),
            errors: z.array(z.unknown()).optional()
        });

        const parsed = GraphQLResponseSchema.parse(response.data);

        if (parsed.errors && parsed.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: 'GraphQL error occurred',
                errors: parsed.errors
            });
        }

        if (!parsed.data) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing data in GraphQL response'
            });
        }

        return {
            userErrors: parsed.data.inventoryMoveQuantities.userErrors,
            inventoryAdjustmentGroup: parsed.data.inventoryMoveQuantities.inventoryAdjustmentGroup ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
