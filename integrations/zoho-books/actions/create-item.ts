import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    organization_id: z
        .string()
        .optional()
        .describe(
            'Zoho Books organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
        ),
    name: z.string().describe('Name of the item. Max-length [100]'),
    rate: z.number().describe('Price of the item.'),
    description: z.string().optional().describe('Description for the item. Max-length [2000]'),
    item_type: z.string().optional().describe('Type of the item. Allowed values: sales, purchases, sales_and_purchases, inventory. Default: sales'),
    unit: z.string().optional().describe('Unit of measurement for the item.'),
    tax_id: z.string().optional().describe('ID of the tax to be associated with the item.'),
    sku: z.string().optional().describe('SKU value of the item, should be unique throughout the product.'),
    product_type: z.string().optional().describe('Specify the type of an item. Allowed values: goods, service, digital_service.'),
    account_id: z.string().optional().describe('ID of the account to which the item has to be associated with.'),
    purchase_description: z.string().optional().describe('Purchase description for the item.'),
    purchase_rate: z.number().optional().describe('Purchase price of the item.'),
    purchase_account_id: z.string().optional().describe('ID of the COGS account to which the item has to be associated with.'),
    inventory_account_id: z.string().optional().describe('ID of the stock account to which the item has to be associated with.'),
    vendor_id: z.string().optional().describe('Preferred vendor ID.'),
    is_taxable: z.boolean().optional().describe('Boolean to track the taxability of the item.'),
    tax_exemption_id: z.string().optional().describe('ID of the tax exemption. Mandatory if is_taxable is false.'),
    hsn_or_sac: z.string().optional().describe('HSN or SAC code.'),
    reorder_level: z.string().optional().describe('Reorder level of the item.')
});

const ProviderItemSchema = z.object({
    item_id: z.coerce.string(),
    name: z.string(),
    status: z.string().optional(),
    description: z.string().optional(),
    rate: z.coerce.number().optional(),
    unit: z.string().optional(),
    tax_id: z.coerce.string().optional(),
    tax_name: z.string().optional(),
    tax_percentage: z.coerce.string().optional(),
    sku: z.string().optional(),
    product_type: z.string().optional(),
    item_type: z.string().optional(),
    account_id: z.coerce.string().optional(),
    account_name: z.string().optional(),
    purchase_description: z.string().optional(),
    purchase_rate: z.coerce.number().optional(),
    purchase_account_id: z.coerce.string().optional(),
    purchase_account_name: z.string().optional(),
    inventory_account_id: z.coerce.string().optional(),
    vendor_id: z.coerce.string().optional(),
    vendor_name: z.string().optional(),
    is_taxable: z.boolean().optional(),
    tax_exemption_id: z.coerce.string().optional(),
    hsn_or_sac: z.coerce.string().optional(),
    reorder_level: z.coerce.string().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    item: ProviderItemSchema.optional()
});

const OutputSchema = z.object({
    item_id: z.string().describe('ID of the created item. Example: "260815000000100002"'),
    name: z.string(),
    status: z.string().optional(),
    description: z.string().optional(),
    rate: z.number().optional(),
    unit: z.string().optional(),
    tax_id: z.string().optional(),
    tax_name: z.string().optional(),
    tax_percentage: z.string().optional(),
    sku: z.string().optional(),
    product_type: z.string().optional(),
    item_type: z.string().optional(),
    account_id: z.string().optional(),
    account_name: z.string().optional(),
    purchase_description: z.string().optional(),
    purchase_rate: z.number().optional(),
    purchase_account_id: z.string().optional(),
    purchase_account_name: z.string().optional(),
    inventory_account_id: z.string().optional(),
    vendor_id: z.string().optional(),
    vendor_name: z.string().optional(),
    is_taxable: z.boolean().optional(),
    tax_exemption_id: z.string().optional(),
    hsn_or_sac: z.string().optional(),
    reorder_level: z.string().optional()
});

const action = createAction({
    description: 'Create an item in Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-item',
        group: 'Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.settings.CREATE', 'ZohoBooks.settings.READ'],

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

        const config: ProxyConfiguration = {
            // https://www.zoho.com/books/api/v3/items/#create-an-item
            endpoint: '/books/v3/items',
            params: {
                organization_id: organizationId
            },
            data: {
                name: input.name,
                rate: input.rate,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.item_type !== undefined && { item_type: input.item_type }),
                ...(input.unit !== undefined && { unit: input.unit }),
                ...(input.tax_id !== undefined && { tax_id: input.tax_id }),
                ...(input.sku !== undefined && { sku: input.sku }),
                ...(input.product_type !== undefined && { product_type: input.product_type }),
                ...(input.account_id !== undefined && { account_id: input.account_id }),
                ...(input.purchase_description !== undefined && { purchase_description: input.purchase_description }),
                ...(input.purchase_rate !== undefined && { purchase_rate: input.purchase_rate }),
                ...(input.purchase_account_id !== undefined && { purchase_account_id: input.purchase_account_id }),
                ...(input.inventory_account_id !== undefined && { inventory_account_id: input.inventory_account_id }),
                ...(input.vendor_id !== undefined && { vendor_id: input.vendor_id }),
                ...(input.is_taxable !== undefined && { is_taxable: input.is_taxable }),
                ...(input.tax_exemption_id !== undefined && { tax_exemption_id: input.tax_exemption_id }),
                ...(input.hsn_or_sac !== undefined && { hsn_or_sac: input.hsn_or_sac }),
                ...(input.reorder_level !== undefined && { reorder_level: input.reorder_level })
            },
            retries: 1
        };

        const response = await nango.post(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Zoho Books API returned an empty response.'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message || 'Zoho Books API returned an error.',
                code: providerResponse.code
            });
        }

        const item = providerResponse.item;

        if (!item) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Provider did not return an item object.'
            });
        }

        return {
            item_id: item.item_id,
            name: item.name,
            ...(item.status !== undefined && { status: item.status }),
            ...(item.description !== undefined && { description: item.description }),
            ...(item.rate !== undefined && { rate: item.rate }),
            ...(item.unit !== undefined && { unit: item.unit }),
            ...(item.tax_id !== undefined && { tax_id: item.tax_id }),
            ...(item.tax_name !== undefined && { tax_name: item.tax_name }),
            ...(item.tax_percentage !== undefined && { tax_percentage: item.tax_percentage }),
            ...(item.sku !== undefined && { sku: item.sku }),
            ...(item.product_type !== undefined && { product_type: item.product_type }),
            ...(item.item_type !== undefined && { item_type: item.item_type }),
            ...(item.account_id !== undefined && { account_id: item.account_id }),
            ...(item.account_name !== undefined && { account_name: item.account_name }),
            ...(item.purchase_description !== undefined && { purchase_description: item.purchase_description }),
            ...(item.purchase_rate !== undefined && { purchase_rate: item.purchase_rate }),
            ...(item.purchase_account_id !== undefined && { purchase_account_id: item.purchase_account_id }),
            ...(item.purchase_account_name !== undefined && { purchase_account_name: item.purchase_account_name }),
            ...(item.inventory_account_id !== undefined && { inventory_account_id: item.inventory_account_id }),
            ...(item.vendor_id !== undefined && { vendor_id: item.vendor_id }),
            ...(item.vendor_name !== undefined && { vendor_name: item.vendor_name }),
            ...(item.is_taxable !== undefined && { is_taxable: item.is_taxable }),
            ...(item.tax_exemption_id !== undefined && { tax_exemption_id: item.tax_exemption_id }),
            ...(item.hsn_or_sac !== undefined && { hsn_or_sac: item.hsn_or_sac }),
            ...(item.reorder_level !== undefined && { reorder_level: item.reorder_level })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
