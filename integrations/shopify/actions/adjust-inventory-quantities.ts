import { z } from 'zod';
import { createAction } from 'nango';
import { createHash } from 'crypto';

const InventoryChangeInputSchema = z.object({
    delta: z.number().int().describe('The amount to change the quantity by. Can be negative.'),
    inventoryItemId: z.string().describe('The inventory item ID. Example: "gid://shopify/InventoryItem/30322695"'),
    locationId: z.string().describe('The location ID. Example: "gid://shopify/Location/124656943"'),
    changeFromQuantity: z.number().int().optional().describe('Optional expected current quantity for optimistic concurrency.')
});

const InputSchema = z.object({
    reason: z.string().describe('The reason for the adjustment. Example: "correction"'),
    name: z.string().describe('The inventory quantity name to adjust. Example: "available"'),
    referenceDocumentUri: z.string().optional().describe('Optional URI referencing the source document.'),
    changes: z.array(InventoryChangeInputSchema).min(1).describe('The list of inventory changes to apply.')
});

const InventoryChangeSchema = z.object({
    name: z.string(),
    delta: z.number().int()
});

const InventoryAdjustmentGroupSchema = z.object({
    createdAt: z.string().optional(),
    reason: z.string().optional(),
    referenceDocumentUri: z.string().nullable().optional(),
    changes: z.array(InventoryChangeSchema).optional()
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const ProviderPayloadSchema = z.object({
    data: z.object({
        inventoryAdjustQuantities: z.object({
            userErrors: z.array(UserErrorSchema),
            inventoryAdjustmentGroup: InventoryAdjustmentGroupSchema.nullable().optional()
        })
    })
});

const OutputSchema = z.object({
    success: z.boolean(),
    userErrors: z.array(
        z.object({
            field: z.array(z.string()).optional(),
            message: z.string()
        })
    ),
    inventoryAdjustmentGroup: z
        .object({
            createdAt: z.string().optional(),
            reason: z.string().optional(),
            referenceDocumentUri: z.string().optional(),
            changes: z
                .array(
                    z.object({
                        name: z.string(),
                        delta: z.number().int()
                    })
                )
                .optional()
        })
        .optional()
});

const action = createAction({
    description: 'Adjust inventory quantities for tracked items.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_inventory'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const idempotencyKey = createHash('sha256').update(JSON.stringify(input)).digest('hex').slice(0, 36);

        const query = `
      mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!, $idempotencyKey: String!) {
        inventoryAdjustQuantities(input: $input) @idempotent(key: $idempotencyKey) {
          userErrors {
            field
            message
          }
          inventoryAdjustmentGroup {
            createdAt
            reason
            referenceDocumentUri
            changes {
              name
              delta
            }
          }
        }
      }
    `;

        // https://shopify.dev/docs/api/admin-graphql/2026-04/mutations/inventoryAdjustQuantities
        const apiResponse = await nango.post({
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: query,
                variables: {
                    input: {
                        reason: input.reason,
                        name: input.name,
                        ...(input.referenceDocumentUri !== undefined && {
                            referenceDocumentUri: input.referenceDocumentUri
                        }),
                        changes: input.changes.map((change) => ({
                            delta: change.delta,
                            inventoryItemId: change.inventoryItemId,
                            locationId: change.locationId,
                            ...(change.changeFromQuantity !== undefined && {
                                changeFromQuantity: change.changeFromQuantity
                            })
                        }))
                    },
                    idempotencyKey: idempotencyKey
                }
            },
            retries: 3
        });

        const graphqlResponse = z
            .object({
                data: z.unknown().optional(),
                errors: z.array(z.object({ message: z.string() })).optional()
            })
            .safeParse(apiResponse.data);

        if (!graphqlResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response format.'
            });
        }

        if (graphqlResponse.data.errors !== undefined && graphqlResponse.data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: graphqlResponse.data.errors.map((error) => error.message).join('; ')
            });
        }

        const payload = ProviderPayloadSchema.safeParse(apiResponse.data);

        if (!payload.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider returned an unexpected response format.',
                details: payload.error.issues.map((issue) => issue.message)
            });
        }

        const result = payload.data.data.inventoryAdjustQuantities;

        if (result.userErrors.length > 0) {
            return {
                success: false,
                userErrors: result.userErrors.map((error) => ({
                    ...(error.field !== undefined && { field: error.field }),
                    message: error.message
                })),
                inventoryAdjustmentGroup: undefined
            };
        }

        const group = result.inventoryAdjustmentGroup;
        const output: z.infer<typeof OutputSchema> = {
            success: true,
            userErrors: []
        };

        if (group !== undefined && group !== null) {
            output.inventoryAdjustmentGroup = {
                ...(group.createdAt !== undefined && { createdAt: group.createdAt }),
                ...(group.reason !== undefined && { reason: group.reason }),
                ...(group.referenceDocumentUri != null && {
                    referenceDocumentUri: group.referenceDocumentUri
                }),
                ...(group.changes !== undefined && {
                    changes: group.changes.map((change) => ({
                        name: change.name,
                        delta: change.delta
                    }))
                })
            };
        }

        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
