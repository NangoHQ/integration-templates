import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const InputSchema = z
    .object({
        name: z.string().describe('Name of the item.'),
        rate: z.number().describe('Sales price of the item.'),
        sku: z.string().optional().describe('Stock Keeping Unit code. Must be unique across items when provided.'),
        description: z.string().optional().describe('Description of the item shown on sales documents.'),
        item_type: z
            .enum(['sales', 'purchases', 'sales_and_purchases', 'inventory'])
            .optional()
            .describe('Whether the item is used for sales, purchases, both, or tracked inventory. Defaults to "sales" when omitted.'),
        product_type: z.enum(['goods', 'service']).optional().describe('Whether the item is a physical good or a service. Defaults to "goods" when omitted.'),
        tax_id: z.string().optional().describe('ID of the tax rate to apply to the item.'),
        purchase_rate: z.number().optional().describe('Purchase price of the item. Only persisted when item_type is "purchases" or "sales_and_purchases".'),
        purchase_account_id: z.string().optional().describe('ID of the account used for purchases of the item.'),
        inventory_account_id: z.string().optional().describe('ID of the inventory asset account for the item.'),
        initial_stock: z.number().optional().describe('Opening stock quantity. Only applied when item_type is "inventory".'),
        initial_stock_rate: z.number().optional().describe('Unit cost used to value the opening stock. Only applied when item_type is "inventory".'),
        unit: z.string().optional().describe('Unit of measurement for the item, for example "qty".'),
        category_id: z.string().optional().describe('ID of the category the item belongs to.'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Fields for creating a new Zoho Inventory item.');

const ProviderItemSchema = z.object({
    item_id: z.union([z.string(), z.number()]),
    name: z.string().optional(),
    sku: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    item_type: z.string().optional(),
    product_type: z.string().optional(),
    status: z.string().optional(),
    rate: z.number().nullable().optional(),
    purchase_rate: z.number().nullable().optional(),
    can_be_sold: z.boolean().optional(),
    can_be_purchased: z.boolean().optional(),
    track_inventory: z.boolean().optional(),
    is_taxable: z.boolean().optional(),
    tax_id: z.union([z.string(), z.number()]).nullable().optional(),
    unit: z.string().nullable().optional(),
    category_id: z.union([z.string(), z.number()]).nullable().optional(),
    stock_on_hand: z.number().nullable().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const CreateItemResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    item: z.unknown().optional()
});

const OutputSchema = z
    .object({
        item_id: z.string().describe('Unique identifier assigned by Zoho to the created item.'),
        name: z.string().optional().describe('Name of the created item.'),
        sku: z.string().optional().describe('Stock Keeping Unit code of the created item.'),
        description: z.string().optional().describe('Description of the created item.'),
        item_type: z.string().optional().describe('Item type stored by Zoho, for example "sales" or "sales_and_purchases".'),
        product_type: z.string().optional().describe('Product type stored by Zoho, either "goods" or "service".'),
        status: z.string().optional().describe('Item status, for example "active".'),
        rate: z.number().optional().describe('Sales price of the created item.'),
        purchase_rate: z.number().optional().describe('Purchase price of the created item.'),
        can_be_sold: z.boolean().optional().describe('Whether the item can be used on sales documents.'),
        can_be_purchased: z.boolean().optional().describe('Whether the item can be used on purchase documents.'),
        track_inventory: z.boolean().optional().describe('Whether inventory tracking is enabled for the item.'),
        is_taxable: z.boolean().optional().describe('Whether the item is taxable.'),
        tax_id: z.string().optional().describe('ID of the tax rate applied to the item.'),
        unit: z.string().optional().describe('Unit of measurement of the item.'),
        category_id: z.string().optional().describe('ID of the category the item belongs to.'),
        stock_on_hand: z.number().optional().describe('Opening stock quantity recorded for the item.'),
        created_time: z.string().optional().describe('Creation timestamp in the organization timezone, for example "2026-10-09T14:28:26-0400".'),
        last_modified_time: z.string().optional().describe('Last modification timestamp in the organization timezone.')
    })
    .describe('The item created in Zoho Inventory.');

/**
 * @tags: [write]
 * @tagReason: Creates a new item in the provider; it mutates provider state but is additive and reversible.
 * @pitfalls: purchase_rate is silently ignored unless item_type is "purchases" or "sales_and_purchases" at creation; initial_stock/initial_stock_rate only apply when item_type is "inventory"; item names must be unique within the organization, so a duplicate name is rejected.
 */
const action = createAction({
    description: 'Create a new inventory item (goods or service).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.items.CREATE', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        // https://www.zoho.com/inventory/api/v1/items/#create-an-item
        const response = await nango.post({
            endpoint: '/inventory/v1/items',
            params: {
                organization_id: organizationId
            },
            data: {
                name: input.name,
                rate: input.rate,
                ...(input.sku !== undefined && { sku: input.sku }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.item_type !== undefined && { item_type: input.item_type }),
                ...(input.product_type !== undefined && { product_type: input.product_type }),
                ...(input.tax_id !== undefined && { tax_id: input.tax_id }),
                ...(input.purchase_rate !== undefined && { purchase_rate: input.purchase_rate }),
                ...(input.purchase_account_id !== undefined && { purchase_account_id: input.purchase_account_id }),
                ...(input.inventory_account_id !== undefined && { inventory_account_id: input.inventory_account_id }),
                ...(input.initial_stock !== undefined && { initial_stock: input.initial_stock }),
                ...(input.initial_stock_rate !== undefined && { initial_stock_rate: input.initial_stock_rate }),
                ...(input.unit !== undefined && { unit: input.unit }),
                ...(input.category_id !== undefined && { category_id: input.category_id })
            },
            // Create is not idempotent: a retry after a lost response would create a duplicate item.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const envelope = CreateItemResponseSchema.safeParse(response.data);
        if (!envelope.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when creating item.',
                details: envelope.error.message
            });
        }

        if (envelope.data.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: envelope.data.message ?? 'Zoho Inventory returned an error while creating the item.',
                code: envelope.data.code
            });
        }

        const parsedItem = ProviderItemSchema.safeParse(envelope.data.item);
        if (!parsedItem.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected item payload from Zoho Inventory API.',
                details: parsedItem.error.message
            });
        }

        const item = parsedItem.data;

        return {
            item_id: String(item.item_id),
            ...(item.name !== undefined && { name: item.name }),
            ...(item.sku != null && { sku: item.sku }),
            ...(item.description != null && { description: item.description }),
            ...(item.item_type !== undefined && { item_type: item.item_type }),
            ...(item.product_type !== undefined && { product_type: item.product_type }),
            ...(item.status !== undefined && { status: item.status }),
            ...(item.rate != null && { rate: item.rate }),
            ...(item.purchase_rate != null && { purchase_rate: item.purchase_rate }),
            ...(item.can_be_sold !== undefined && { can_be_sold: item.can_be_sold }),
            ...(item.can_be_purchased !== undefined && { can_be_purchased: item.can_be_purchased }),
            ...(item.track_inventory !== undefined && { track_inventory: item.track_inventory }),
            ...(item.is_taxable !== undefined && { is_taxable: item.is_taxable }),
            ...(item.tax_id != null && { tax_id: String(item.tax_id) }),
            ...(item.unit != null && { unit: item.unit }),
            ...(item.category_id != null && { category_id: String(item.category_id) }),
            ...(item.stock_on_hand != null && { stock_on_hand: item.stock_on_hand }),
            ...(item.created_time !== undefined && { created_time: item.created_time }),
            ...(item.last_modified_time !== undefined && { last_modified_time: item.last_modified_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
