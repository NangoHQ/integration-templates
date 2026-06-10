import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    item_id: z.string().describe('Item ID. Example: "260815000000100002"'),
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.')
});

const ItemTaxPreferenceSchema = z.object({
    tax_id: z.string().optional(),
    tax_specification: z.string().optional()
});

const CustomFieldSchema = z.object({
    customfield_id: z.string().optional(),
    value: z.string().optional()
});

const LocationSchema = z.object({
    location_id: z.string().optional(),
    location_name: z.string().optional(),
    status: z.string().optional(),
    is_primary: z.boolean().optional(),
    location_stock_on_hand: z.string().optional(),
    location_available_stock: z.string().optional(),
    location_actual_available_stock: z.string().optional()
});

const ProviderItemSchema = z.object({
    item_id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    description: z.string().optional(),
    rate: z.number().optional(),
    unit: z.string().optional(),
    tax_id: z.string().optional(),
    purchase_tax_rule_id: z.string().optional(),
    sales_tax_rule_id: z.string().optional(),
    tax_name: z.string().optional(),
    tax_percentage: z.union([z.string(), z.number()]).optional(),
    tax_type: z.string().optional(),
    hsn_or_sac: z.string().optional(),
    sat_item_key_code: z.string().optional(),
    unitkey_code: z.string().optional(),
    sku: z.string().optional(),
    product_type: z.string().optional(),
    item_tax_preferences: z.array(ItemTaxPreferenceSchema).optional(),
    custom_fields: z.array(CustomFieldSchema).optional(),
    locations: z.array(LocationSchema).optional()
});

const OutputSchema = z.object({
    item_id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    description: z.string().optional(),
    rate: z.number().optional(),
    unit: z.string().optional(),
    tax_id: z.string().optional(),
    purchase_tax_rule_id: z.string().optional(),
    sales_tax_rule_id: z.string().optional(),
    tax_name: z.string().optional(),
    tax_percentage: z.string().optional(),
    tax_type: z.string().optional(),
    hsn_or_sac: z.string().optional(),
    sat_item_key_code: z.string().optional(),
    unitkey_code: z.string().optional(),
    sku: z.string().optional(),
    product_type: z.string().optional(),
    item_tax_preferences: z.array(ItemTaxPreferenceSchema).optional(),
    custom_fields: z.array(CustomFieldSchema).optional(),
    locations: z.array(LocationSchema).optional()
});

const ResponseWrapperSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    item: z.unknown().optional()
});

const action = createAction({
    description: 'Retrieve a single item from Zoho Books',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-item',
        group: 'Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.items.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            const firstOrg = orgData.organizations?.[0];
            if (orgData.code !== 0 || !firstOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            organizationId = firstOrg.organization_id;
        }

        // https://www.zoho.com/books/api/v3/items/#get-an-item
        const response = await nango.get({
            endpoint: `/books/v3/items/${encodeURIComponent(input.item_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Item not found or invalid response',
                item_id: input.item_id
            });
        }

        const parsedResponse = ResponseWrapperSchema.safeParse(response.data);

        if (!parsedResponse.success || !parsedResponse.data.item || typeof parsedResponse.data.item !== 'object' || Array.isArray(parsedResponse.data.item)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Item not found',
                item_id: input.item_id
            });
        }

        const providerItem = ProviderItemSchema.parse(parsedResponse.data.item);

        return {
            item_id: providerItem.item_id,
            ...(providerItem.name !== undefined && { name: providerItem.name }),
            ...(providerItem.status !== undefined && { status: providerItem.status }),
            ...(providerItem.description !== undefined && { description: providerItem.description }),
            ...(providerItem.rate !== undefined && { rate: providerItem.rate }),
            ...(providerItem.unit !== undefined && { unit: providerItem.unit }),
            ...(providerItem.tax_id !== undefined && { tax_id: providerItem.tax_id }),
            ...(providerItem.purchase_tax_rule_id !== undefined && { purchase_tax_rule_id: providerItem.purchase_tax_rule_id }),
            ...(providerItem.sales_tax_rule_id !== undefined && { sales_tax_rule_id: providerItem.sales_tax_rule_id }),
            ...(providerItem.tax_name !== undefined && { tax_name: providerItem.tax_name }),
            ...(providerItem.tax_percentage !== undefined && { tax_percentage: String(providerItem.tax_percentage) }),
            ...(providerItem.tax_type !== undefined && { tax_type: providerItem.tax_type }),
            ...(providerItem.hsn_or_sac !== undefined && { hsn_or_sac: providerItem.hsn_or_sac }),
            ...(providerItem.sat_item_key_code !== undefined && { sat_item_key_code: providerItem.sat_item_key_code }),
            ...(providerItem.unitkey_code !== undefined && { unitkey_code: providerItem.unitkey_code }),
            ...(providerItem.sku !== undefined && { sku: providerItem.sku }),
            ...(providerItem.product_type !== undefined && { product_type: providerItem.product_type }),
            ...(providerItem.item_tax_preferences !== undefined && { item_tax_preferences: providerItem.item_tax_preferences }),
            ...(providerItem.custom_fields !== undefined && { custom_fields: providerItem.custom_fields }),
            ...(providerItem.locations !== undefined && { locations: providerItem.locations })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
