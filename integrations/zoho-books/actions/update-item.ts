import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    item_id: z.string().describe('Unique identifier of the item. Example: "260815000000100002"'),
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        ),
    name: z.string().describe('Name of the item. Max-length [100]'),
    rate: z.number().describe('Price of the item.'),
    description: z.string().optional().describe('Description for the item. Max-length [2000]'),
    tax_id: z.string().optional().describe('ID of the tax to be associated to the item.'),
    tax_percentage: z.string().optional().describe('Percent of the tax.'),
    sku: z.string().optional().describe('SKU value of item, should be unique throughout the product.'),
    product_type: z.string().optional().describe('Type of an item. Allowed values: goods, service, digital_service.'),
    item_type: z.string().optional().describe('Type of the item. Allowed values: sales, purchases, sales_and_purchases, inventory.'),
    purchase_description: z.string().optional().describe('Purchase description for the item.'),
    purchase_rate: z.string().optional().describe('Purchase price of the item.'),
    account_id: z.string().optional().describe('ID of the account to which the item has to be associated with.'),
    purchase_account_id: z.string().optional().describe('ID of the COGS account to which the item has to be associated with.'),
    inventory_account_id: z.string().optional().describe('ID of the stock account to which the item has to be associated with.'),
    vendor_id: z.string().optional().describe('Preferred vendor ID.'),
    is_taxable: z.boolean().optional().describe('Boolean to track the taxability of the item.'),
    tax_exemption_id: z.string().optional().describe('ID of the tax exemption.'),
    hsn_or_sac: z.string().optional().describe('HSN Code.'),
    reorder_level: z.string().optional().describe('Reorder level of the item.'),
    avatax_tax_code: z.string().optional().describe('Avalara tax code.'),
    avatax_use_code: z.string().optional().describe('Avalara use code.'),
    purchase_tax_rule_id: z.string().optional().describe('Id of the purchase tax rule.'),
    sales_tax_rule_id: z.string().optional().describe('Id of the sales tax rule.'),
    purchase_tax_exemption_id: z.string().optional().describe('ID of the purchase tax exemption.'),
    sat_item_key_code: z.string().optional().describe('SAT Item Key Code.'),
    unitkey_code: z.string().optional().describe('Unit Key Code.'),
    locations: z
        .array(
            z.object({
                location_id: z.string().optional(),
                initial_stock: z.string().optional(),
                initial_stock_rate: z.string().optional()
            })
        )
        .optional()
        .describe('Locations for the item.'),
    item_tax_preferences: z
        .array(
            z.object({
                tax_id: z.string().optional(),
                tax_specification: z.string().optional()
            })
        )
        .optional()
        .describe('Tax preferences for the item.'),
    custom_fields: z
        .array(
            z.object({
                customfield_id: z.string().optional(),
                value: z.string().optional()
            })
        )
        .optional()
        .describe('Custom fields for an item.')
});

const ProviderItemSchema = z.object({
    item_id: z.union([z.string(), z.number()]).optional(),
    name: z.string().optional(),
    status: z.string().optional(),
    description: z.string().optional(),
    rate: z.union([z.number(), z.string()]).optional(),
    unit: z.string().optional(),
    hsn_or_sac: z.string().optional(),
    sat_item_key_code: z.string().optional(),
    unitkey_code: z.string().optional(),
    tax_id: z.union([z.string(), z.number()]).optional(),
    purchase_tax_rule_id: z.union([z.string(), z.number()]).optional(),
    sales_tax_rule_id: z.union([z.string(), z.number()]).optional(),
    tax_name: z.string().optional(),
    tax_percentage: z.union([z.string(), z.number()]).optional(),
    tax_type: z.string().optional(),
    sku: z.string().optional(),
    product_type: z.string().optional(),
    is_taxable: z.boolean().optional(),
    tax_exemption_id: z.union([z.string(), z.number()]).optional(),
    purchase_tax_exemption_id: z.union([z.string(), z.number()]).optional(),
    account_id: z.union([z.string(), z.number()]).optional(),
    avatax_tax_code: z.union([z.string(), z.number()]).optional(),
    avatax_use_code: z.union([z.string(), z.number()]).optional(),
    item_type: z.string().optional(),
    purchase_description: z.string().optional(),
    purchase_rate: z.union([z.string(), z.number()]).optional(),
    purchase_account_id: z.union([z.string(), z.number()]).optional(),
    inventory_account_id: z.union([z.string(), z.number()]).optional(),
    vendor_id: z.union([z.string(), z.number()]).optional(),
    reorder_level: z.union([z.string(), z.number()]).optional(),
    item_tax_preferences: z
        .array(
            z.object({
                tax_id: z.union([z.string(), z.number()]).optional(),
                tax_specification: z.string().optional()
            })
        )
        .optional(),
    locations: z
        .array(
            z.object({
                location_id: z.union([z.string(), z.number()]).optional(),
                location_name: z.string().optional(),
                status: z.string().optional(),
                is_primary: z.boolean().optional(),
                location_stock_on_hand: z.union([z.string(), z.number()]).optional(),
                location_available_stock: z.union([z.string(), z.number()]).optional(),
                location_actual_available_stock: z.union([z.string(), z.number()]).optional()
            })
        )
        .optional(),
    custom_fields: z
        .array(
            z.object({
                customfield_id: z.union([z.string(), z.number()]).optional(),
                value: z.string().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    item_id: z.string().optional(),
    name: z.string().optional(),
    status: z.string().optional(),
    description: z.string().optional(),
    rate: z.number().optional(),
    unit: z.string().optional(),
    sku: z.string().optional(),
    product_type: z.string().optional(),
    item_type: z.string().optional(),
    tax_id: z.string().optional(),
    tax_name: z.string().optional(),
    tax_percentage: z.string().optional(),
    tax_type: z.string().optional(),
    account_id: z.string().optional(),
    purchase_account_id: z.string().optional(),
    inventory_account_id: z.string().optional(),
    purchase_description: z.string().optional(),
    purchase_rate: z.string().optional(),
    vendor_id: z.string().optional(),
    is_taxable: z.boolean().optional(),
    tax_exemption_id: z.string().optional(),
    purchase_tax_exemption_id: z.string().optional(),
    hsn_or_sac: z.string().optional(),
    reorder_level: z.string().optional(),
    avatax_tax_code: z.string().optional(),
    avatax_use_code: z.string().optional(),
    purchase_tax_rule_id: z.string().optional(),
    sales_tax_rule_id: z.string().optional(),
    sat_item_key_code: z.string().optional(),
    unitkey_code: z.string().optional(),
    item_tax_preferences: z
        .array(
            z.object({
                tax_id: z.string().optional(),
                tax_specification: z.string().optional()
            })
        )
        .optional(),
    locations: z
        .array(
            z.object({
                location_id: z.string().optional(),
                location_name: z.string().optional(),
                status: z.string().optional(),
                is_primary: z.boolean().optional(),
                location_stock_on_hand: z.string().optional(),
                location_available_stock: z.string().optional(),
                location_actual_available_stock: z.string().optional()
            })
        )
        .optional(),
    custom_fields: z
        .array(
            z.object({
                customfield_id: z.string().optional(),
                value: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Update an item in Zoho Books.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.settings.UPDATE', 'ZohoBooks.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Failed to retrieve organizations from Zoho Books.'
                });
            }
            if (!orgData.organizations || orgData.organizations.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            if (orgData.organizations.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_organizations',
                    message: `Multiple organizations found (${orgData.organizations.map((o) => o.organization_id).join(', ')}). Provide organization_id in the action input.`
                });
            }
            const singleOrg = orgData.organizations[0];
            if (!singleOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            organizationId = singleOrg.organization_id;
        }

        const data = {
            name: input.name,
            rate: input.rate,
            ...(input.description !== undefined && { description: input.description }),
            ...(input.tax_id !== undefined && { tax_id: input.tax_id }),
            ...(input.tax_percentage !== undefined && { tax_percentage: input.tax_percentage }),
            ...(input.sku !== undefined && { sku: input.sku }),
            ...(input.product_type !== undefined && { product_type: input.product_type }),
            ...(input.item_type !== undefined && { item_type: input.item_type }),
            ...(input.purchase_description !== undefined && { purchase_description: input.purchase_description }),
            ...(input.purchase_rate !== undefined && { purchase_rate: input.purchase_rate }),
            ...(input.account_id !== undefined && { account_id: input.account_id }),
            ...(input.purchase_account_id !== undefined && { purchase_account_id: input.purchase_account_id }),
            ...(input.inventory_account_id !== undefined && { inventory_account_id: input.inventory_account_id }),
            ...(input.vendor_id !== undefined && { vendor_id: input.vendor_id }),
            ...(input.is_taxable !== undefined && { is_taxable: input.is_taxable }),
            ...(input.tax_exemption_id !== undefined && { tax_exemption_id: input.tax_exemption_id }),
            ...(input.hsn_or_sac !== undefined && { hsn_or_sac: input.hsn_or_sac }),
            ...(input.reorder_level !== undefined && { reorder_level: input.reorder_level }),
            ...(input.avatax_tax_code !== undefined && { avatax_tax_code: input.avatax_tax_code }),
            ...(input.avatax_use_code !== undefined && { avatax_use_code: input.avatax_use_code }),
            ...(input.purchase_tax_rule_id !== undefined && { purchase_tax_rule_id: input.purchase_tax_rule_id }),
            ...(input.sales_tax_rule_id !== undefined && { sales_tax_rule_id: input.sales_tax_rule_id }),
            ...(input.purchase_tax_exemption_id !== undefined && { purchase_tax_exemption_id: input.purchase_tax_exemption_id }),
            ...(input.sat_item_key_code !== undefined && { sat_item_key_code: input.sat_item_key_code }),
            ...(input.unitkey_code !== undefined && { unitkey_code: input.unitkey_code }),
            ...(input.locations !== undefined && { locations: input.locations }),
            ...(input.item_tax_preferences !== undefined && { item_tax_preferences: input.item_tax_preferences }),
            ...(input.custom_fields !== undefined && { custom_fields: input.custom_fields })
        };

        // https://www.zoho.com/books/api/v3/items/#update-an-item
        const response = await nango.put({
            endpoint: `/books/v3/items/${encodeURIComponent(input.item_id)}`,
            params: {
                organization_id: organizationId
            },
            data: data,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Zoho Books API.'
            });
        }

        const ResponseSchema = z.object({
            item: z.unknown()
        });
        const responseData = ResponseSchema.parse(response.data);
        const providerItem = ProviderItemSchema.parse(responseData.item);

        return {
            ...(providerItem.item_id != null && { item_id: String(providerItem.item_id) }),
            ...(providerItem.name != null && { name: providerItem.name }),
            ...(providerItem.status != null && { status: providerItem.status }),
            ...(providerItem.description != null && { description: providerItem.description }),
            ...(providerItem.rate != null && { rate: typeof providerItem.rate === 'string' ? parseFloat(providerItem.rate) : providerItem.rate }),
            ...(providerItem.unit != null && { unit: providerItem.unit }),
            ...(providerItem.sku != null && { sku: providerItem.sku }),
            ...(providerItem.product_type != null && { product_type: providerItem.product_type }),
            ...(providerItem.item_type != null && { item_type: providerItem.item_type }),
            ...(providerItem.tax_id != null && { tax_id: String(providerItem.tax_id) }),
            ...(providerItem.tax_name != null && { tax_name: providerItem.tax_name }),
            ...(providerItem.tax_percentage != null && { tax_percentage: String(providerItem.tax_percentage) }),
            ...(providerItem.tax_type != null && { tax_type: providerItem.tax_type }),
            ...(providerItem.account_id != null && { account_id: String(providerItem.account_id) }),
            ...(providerItem.purchase_account_id != null && { purchase_account_id: String(providerItem.purchase_account_id) }),
            ...(providerItem.inventory_account_id != null && { inventory_account_id: String(providerItem.inventory_account_id) }),
            ...(providerItem.purchase_description != null && { purchase_description: providerItem.purchase_description }),
            ...(providerItem.purchase_rate != null && { purchase_rate: String(providerItem.purchase_rate) }),
            ...(providerItem.vendor_id != null && { vendor_id: String(providerItem.vendor_id) }),
            ...(providerItem.is_taxable != null && { is_taxable: providerItem.is_taxable }),
            ...(providerItem.tax_exemption_id != null && { tax_exemption_id: String(providerItem.tax_exemption_id) }),
            ...(providerItem.purchase_tax_exemption_id != null && { purchase_tax_exemption_id: String(providerItem.purchase_tax_exemption_id) }),
            ...(providerItem.hsn_or_sac != null && { hsn_or_sac: providerItem.hsn_or_sac }),
            ...(providerItem.reorder_level != null && { reorder_level: String(providerItem.reorder_level) }),
            ...(providerItem.avatax_tax_code != null && { avatax_tax_code: String(providerItem.avatax_tax_code) }),
            ...(providerItem.avatax_use_code != null && { avatax_use_code: String(providerItem.avatax_use_code) }),
            ...(providerItem.purchase_tax_rule_id != null && { purchase_tax_rule_id: String(providerItem.purchase_tax_rule_id) }),
            ...(providerItem.sales_tax_rule_id != null && { sales_tax_rule_id: String(providerItem.sales_tax_rule_id) }),
            ...(providerItem.sat_item_key_code != null && { sat_item_key_code: providerItem.sat_item_key_code }),
            ...(providerItem.unitkey_code != null && { unitkey_code: providerItem.unitkey_code }),
            ...(providerItem.item_tax_preferences != null && {
                item_tax_preferences: providerItem.item_tax_preferences.map((pref) => ({
                    ...(pref.tax_id != null && { tax_id: String(pref.tax_id) }),
                    ...(pref.tax_specification != null && { tax_specification: pref.tax_specification })
                }))
            }),
            ...(providerItem.locations != null && {
                locations: providerItem.locations.map((loc) => ({
                    ...(loc.location_id != null && { location_id: String(loc.location_id) }),
                    ...(loc.location_name != null && { location_name: loc.location_name }),
                    ...(loc.status != null && { status: loc.status }),
                    ...(loc.is_primary != null && { is_primary: loc.is_primary }),
                    ...(loc.location_stock_on_hand != null && { location_stock_on_hand: String(loc.location_stock_on_hand) }),
                    ...(loc.location_available_stock != null && { location_available_stock: String(loc.location_available_stock) }),
                    ...(loc.location_actual_available_stock != null && { location_actual_available_stock: String(loc.location_actual_available_stock) })
                }))
            }),
            ...(providerItem.custom_fields != null && {
                custom_fields: providerItem.custom_fields.map((cf) => ({
                    ...(cf.customfield_id != null && { customfield_id: String(cf.customfield_id) }),
                    ...(cf.value != null && { value: cf.value })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
