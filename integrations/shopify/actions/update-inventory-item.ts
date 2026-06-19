import { z } from 'zod';
import { createAction } from 'nango';

const CountryHarmonizedSystemCodeInputSchema = z.object({
    countryCode: z.string(),
    harmonizedSystemCode: z.string()
});

const InputSchema = z.object({
    id: z.string().describe('The ID of the inventory item to update. Example: "gid://shopify/InventoryItem/43729076"'),
    sku: z.string().optional().describe('The SKU of the inventory item.'),
    tracked: z.boolean().optional().describe('Whether inventory levels are tracked for the item.'),
    requiresShipping: z.boolean().optional().describe('Whether the inventory item requires shipping.'),
    cost: z.number().optional().describe('The unit cost associated with the inventory item.'),
    countryCodeOfOrigin: z.string().optional().describe('The ISO 3166-1 alpha-2 country code of where the item originated from.'),
    provinceCodeOfOrigin: z.string().optional().describe('The ISO 3166-2 alpha-2 province code of where the item originated from.'),
    harmonizedSystemCode: z.string().optional().describe('The harmonized system code of the inventory item.'),
    countryHarmonizedSystemCodes: z.array(CountryHarmonizedSystemCodeInputSchema).optional().describe('List of country-specific harmonized system codes.')
});

const ProviderInventoryItemSchema = z.object({
    id: z.string(),
    sku: z.string().nullable().optional(),
    tracked: z.boolean(),
    requiresShipping: z.boolean(),
    countryCodeOfOrigin: z.string().nullable().optional(),
    provinceCodeOfOrigin: z.string().nullable().optional(),
    harmonizedSystemCode: z.string().nullable().optional(),
    unitCost: z
        .object({
            amount: z.string()
        })
        .nullable()
        .optional()
});

const ProviderUserErrorSchema = z.object({
    message: z.string(),
    field: z.array(z.string()).nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        inventoryItemUpdate: z.object({
            inventoryItem: ProviderInventoryItemSchema.nullable().optional(),
            userErrors: z.array(ProviderUserErrorSchema)
        })
    })
});

const OutputSchema = z.object({
    id: z.string(),
    sku: z.string().optional(),
    tracked: z.boolean(),
    requiresShipping: z.boolean(),
    cost: z.number().optional(),
    countryCodeOfOrigin: z.string().optional(),
    provinceCodeOfOrigin: z.string().optional(),
    harmonizedSystemCode: z.string().optional()
});

const action = createAction({
    description: 'Update mutable fields on a Shopify inventory item.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_inventory'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const variables = {
            id: input.id,
            input: {
                ...(input.sku !== undefined && { sku: input.sku }),
                ...(input.tracked !== undefined && { tracked: input.tracked }),
                ...(input.requiresShipping !== undefined && { requiresShipping: input.requiresShipping }),
                ...(input.cost !== undefined && { cost: input.cost }),
                ...(input.countryCodeOfOrigin !== undefined && { countryCodeOfOrigin: input.countryCodeOfOrigin }),
                ...(input.provinceCodeOfOrigin !== undefined && { provinceCodeOfOrigin: input.provinceCodeOfOrigin }),
                ...(input.harmonizedSystemCode !== undefined && { harmonizedSystemCode: input.harmonizedSystemCode }),
                ...(input.countryHarmonizedSystemCodes !== undefined && { countryHarmonizedSystemCodes: input.countryHarmonizedSystemCodes })
            }
        };

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-10/mutations/inventoryItemUpdate
            endpoint: 'admin/api/2025-10/graphql.json',
            data: {
                query: `
                    mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
                        inventoryItemUpdate(id: $id, input: $input) {
                            inventoryItem {
                                id
                                sku
                                tracked
                                requiresShipping
                                countryCodeOfOrigin
                                provinceCodeOfOrigin
                                harmonizedSystemCode
                                unitCost {
                                    amount
                                }
                            }
                            userErrors {
                                message
                                field
                            }
                        }
                    }
                `,
                variables
            },
            retries: 1
        });

        const payload = ProviderResponseSchema.parse(response.data);
        const result = payload.data.inventoryItemUpdate;

        if (result.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'shopify_user_error',
                message: result.userErrors.map((e) => e.message).join('; '),
                userErrors: result.userErrors.map((e) => ({
                    message: e.message,
                    ...(e.field != null && { field: e.field })
                }))
            });
        }

        const item = result.inventoryItem;
        if (!item) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Inventory item not found after update.'
            });
        }

        return {
            id: item.id,
            tracked: item.tracked,
            requiresShipping: item.requiresShipping,
            ...(item.sku != null && { sku: item.sku }),
            ...(item.countryCodeOfOrigin != null && { countryCodeOfOrigin: item.countryCodeOfOrigin }),
            ...(item.provinceCodeOfOrigin != null && { provinceCodeOfOrigin: item.provinceCodeOfOrigin }),
            ...(item.harmonizedSystemCode != null && { harmonizedSystemCode: item.harmonizedSystemCode }),
            ...(item.unitCost != null && { cost: Number(item.unitCost.amount) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
