import { z } from 'zod';
import { createAction } from 'nango';

const InventoryQuantityInputSchema = z.object({
    inventoryItemId: z.string().describe('Global ID of the inventory item. Example: gid://shopify/InventoryItem/1234567890'),
    locationId: z.string().describe('Global ID of the location. Example: gid://shopify/Location/1234567890'),
    quantity: z.number().int().describe('The absolute quantity to set.'),
    changeFromQuantity: z
        .number()
        .int()
        .nullable()
        .optional()
        .describe('Expected current quantity for compare-and-swap safety. Pass null or omit to skip the CAS check.')
});

const InputSchema = z.object({
    name: z.enum(['available', 'on_hand']).describe('The name of the quantity to change.'),
    quantities: z.array(InventoryQuantityInputSchema).describe('The inventory item quantities to set.'),
    reason: z.string().describe('The reason for the quantity change. Example: correction, received, damaged, etc.'),
    referenceDocumentUri: z.string().optional().describe('URI representing the source of the inventory change.')
});

const ProviderUserErrorSchema = z.object({
    code: z.string().optional(),
    field: z.array(z.string()).optional(),
    message: z.string()
});

const ProviderChangeSchema = z.object({
    name: z.string(),
    delta: z.number().int(),
    quantityAfterChange: z.number().int().nullable().optional()
});

const ProviderInventoryAdjustmentGroupSchema = z.object({
    createdAt: z.string().optional(),
    reason: z.string(),
    referenceDocumentUri: z.string().nullable().optional(),
    changes: z.array(ProviderChangeSchema)
});

const ProviderResponseSchema = z.object({
    data: z.object({
        inventorySetQuantities: z.object({
            inventoryAdjustmentGroup: ProviderInventoryAdjustmentGroupSchema.nullable().optional(),
            userErrors: z.array(ProviderUserErrorSchema)
        })
    })
});

const OutputSchema = z.object({
    inventoryAdjustmentGroup: z
        .object({
            createdAt: z.string().optional(),
            reason: z.string(),
            referenceDocumentUri: z.string().optional(),
            changes: z.array(
                z.object({
                    name: z.string(),
                    delta: z.number().int(),
                    quantityAfterChange: z.number().int().optional()
                })
            )
        })
        .nullable()
        .optional()
});

const action = createAction({
    description: 'Set absolute inventory quantities for tracked items.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/set-inventory-quantities',
        group: 'Inventory'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_inventory'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.quantities.length === 0) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: 'At least one quantity entry is required.'
            });
        }

        const query = `
            mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
                inventorySetQuantities(input: $input) {
                    inventoryAdjustmentGroup {
                        createdAt
                        reason
                        referenceDocumentUri
                        changes {
                            name
                            delta
                            quantityAfterChange
                        }
                    }
                    userErrors {
                        code
                        field
                        message
                    }
                }
            }
        `;

        const variables = {
            input: {
                name: input.name,
                reason: input.reason,
                ...(input.referenceDocumentUri !== undefined && { referenceDocumentUri: input.referenceDocumentUri }),
                quantities: input.quantities.map((q) => ({
                    inventoryItemId: q.inventoryItemId,
                    locationId: q.locationId,
                    quantity: q.quantity,
                    changeFromQuantity: q.changeFromQuantity !== undefined ? q.changeFromQuantity : null
                }))
            }
        };

        // https://shopify.dev/docs/api/admin-graphql/2026-01/mutations/inventorySetQuantities
        const response = await nango.post({
            endpoint: '/admin/api/2026-01/graphql.json',
            data: { query, variables },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const result = parsed.data.inventorySetQuantities;

        if (result.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'shopify_user_error',
                message: result.userErrors.map((err) => err.message).join('; '),
                errors: result.userErrors
            });
        }

        const group = result.inventoryAdjustmentGroup;

        if (!group) {
            return { inventoryAdjustmentGroup: null };
        }

        return {
            inventoryAdjustmentGroup: {
                reason: group.reason,
                ...(group.createdAt !== undefined && group.createdAt !== null && { createdAt: group.createdAt }),
                ...(group.referenceDocumentUri != null && { referenceDocumentUri: group.referenceDocumentUri }),
                changes: group.changes.map((change) => ({
                    name: change.name,
                    delta: change.delta,
                    ...(change.quantityAfterChange != null && { quantityAfterChange: change.quantityAfterChange })
                }))
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
