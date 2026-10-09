import { createSync } from 'nango';
import { z } from 'zod';

import { OrganizationMetadataSchema, resolveSyncOrganizationId } from '../helpers/organization.js';
import { paginateByLastModifiedTime } from '../helpers/pagination.js';

const CustomFieldSchema = z
    .object({
        customfield_id: z.union([z.string(), z.number()]).optional().nullable().describe('Unique identifier of the custom field.'),
        label: z.string().optional().nullable().describe('Display label of the custom field.'),
        value: z.string().optional().nullable().describe('Value of the custom field for this item.')
    })
    .describe('A custom field value configured on the item.');

const ItemSchema = z
    .object({
        id: z.string().describe('Stable unique identifier of the item (the Zoho item_id as a string).'),
        item_id: z.union([z.string(), z.number()]).describe('Unique identifier of the item in Zoho Inventory.'),
        group_id: z.union([z.string(), z.number()]).optional().nullable().describe('Identifier of the item group this item belongs to, if any.'),
        group_name: z.string().optional().nullable().describe('Name of the item group this item belongs to, if any.'),
        name: z.string().optional().nullable().describe('Display name of the item.'),
        item_name: z.string().optional().nullable().describe('Display name of the item as returned by Zoho.'),
        unit: z.string().optional().nullable().describe('Unit of measurement for the item, e.g. hour, box or qty.'),
        status: z.string().optional().nullable().describe('Status of the item, e.g. active or inactive.'),
        source: z.string().optional().nullable().describe('Source through which the item was created.'),
        is_combo_product: z.boolean().optional().nullable().describe('Whether the item is a composite/bundle product.'),
        is_linked_with_zohocrm: z.boolean().optional().nullable().describe('Whether the item is linked with a Zoho CRM product.'),
        zcrm_product_id: z.string().optional().nullable().describe('Identifier of the linked Zoho CRM product, if any.'),
        description: z.string().optional().nullable().describe('Sales description of the item.'),
        brand: z.string().optional().nullable().describe('Brand of the item.'),
        manufacturer: z.string().optional().nullable().describe('Manufacturer of the item.'),
        rate: z.number().optional().nullable().describe('Default selling price of the item.'),
        tax_id: z.union([z.string(), z.number()]).optional().nullable().describe('Identifier of the sales tax applied to the item.'),
        tax_name: z.string().optional().nullable().describe('Name of the sales tax applied to the item.'),
        tax_percentage: z.number().optional().nullable().describe('Sales tax percentage applied to the item.'),
        purchase_account_id: z.union([z.string(), z.number()]).optional().nullable().describe('Identifier of the purchase account.'),
        purchase_account_name: z.string().optional().nullable().describe('Name of the purchase account.'),
        account_id: z.union([z.string(), z.number()]).optional().nullable().describe('Identifier of the sales account.'),
        account_name: z.string().optional().nullable().describe('Name of the sales account.'),
        purchase_description: z.string().optional().nullable().describe('Purchase description of the item.'),
        purchase_rate: z.number().optional().nullable().describe('Default purchase price of the item.'),
        can_be_sold: z.boolean().optional().nullable().describe('Whether the item can be used on sales transactions.'),
        can_be_purchased: z.boolean().optional().nullable().describe('Whether the item can be used on purchase transactions.'),
        track_inventory: z.boolean().optional().nullable().describe('Whether stock tracking is enabled for the item.'),
        item_type: z.string().optional().nullable().describe('Item type, e.g. sales, purchases, sales_and_purchases or inventory.'),
        product_type: z.string().optional().nullable().describe('Product type, e.g. goods or service.'),
        has_attachment: z.boolean().optional().nullable().describe('Whether the item has an attached image or document.'),
        is_returnable: z.boolean().optional().nullable().describe('Whether the item is returnable.'),
        attribute_id1: z.union([z.string(), z.number()]).optional().nullable().describe('Identifier of the first variant attribute of the item.'),
        attribute_name1: z.string().optional().nullable().describe('Name of the first variant attribute of the item.'),
        attribute_type1: z.string().optional().nullable().describe('Data type of the first variant attribute of the item.'),
        attribute_id2: z.union([z.string(), z.number()]).optional().nullable().describe('Identifier of the second variant attribute of the item.'),
        attribute_name2: z.string().optional().nullable().describe('Name of the second variant attribute of the item.'),
        attribute_type2: z.string().optional().nullable().describe('Data type of the second variant attribute of the item.'),
        attribute_id3: z.union([z.string(), z.number()]).optional().nullable().describe('Identifier of the third variant attribute of the item.'),
        attribute_name3: z.string().optional().nullable().describe('Name of the third variant attribute of the item.'),
        attribute_type3: z.string().optional().nullable().describe('Data type of the third variant attribute of the item.'),
        attribute_option_id1: z
            .union([z.string(), z.number()])
            .optional()
            .nullable()
            .describe('Identifier of the selected option for the first variant attribute.'),
        attribute_option_name1: z.string().optional().nullable().describe('Name of the selected option for the first variant attribute.'),
        attribute_option_data1: z.string().optional().nullable().describe('Additional data for the selected option of the first variant attribute.'),
        attribute_option_id2: z
            .union([z.string(), z.number()])
            .optional()
            .nullable()
            .describe('Identifier of the selected option for the second variant attribute.'),
        attribute_option_name2: z.string().optional().nullable().describe('Name of the selected option for the second variant attribute.'),
        attribute_option_data2: z.string().optional().nullable().describe('Additional data for the selected option of the second variant attribute.'),
        attribute_option_id3: z
            .union([z.string(), z.number()])
            .optional()
            .nullable()
            .describe('Identifier of the selected option for the third variant attribute.'),
        attribute_option_name3: z.string().optional().nullable().describe('Name of the selected option for the third variant attribute.'),
        attribute_option_data3: z.string().optional().nullable().describe('Additional data for the selected option of the third variant attribute.'),
        sku: z.string().optional().nullable().describe('Stock keeping unit code of the item.'),
        upc: z.union([z.string(), z.number()]).optional().nullable().describe('Universal Product Code of the item.'),
        ean: z.union([z.string(), z.number()]).optional().nullable().describe('European Article Number of the item.'),
        isbn: z.union([z.string(), z.number()]).optional().nullable().describe('International Standard Book Number of the item.'),
        part_number: z.union([z.string(), z.number()]).optional().nullable().describe('Manufacturer part number of the item.'),
        is_storage_location_enabled: z.boolean().optional().nullable().describe('Whether storage location tracking is enabled for the item.'),
        image_name: z.string().optional().nullable().describe('File name of the primary image of the item.'),
        image_type: z.string().optional().nullable().describe('File type of the primary image of the item.'),
        image_document_id: z.union([z.string(), z.number()]).optional().nullable().describe('Document identifier of the primary image of the item.'),
        created_time: z.string().optional().nullable().describe('Timestamp when the item was created, in Zoho offset format (e.g. 2026-10-09T13:18:39-0400).'),
        last_modified_time: z
            .string()
            .optional()
            .nullable()
            .describe('Timestamp when the item was last modified, in Zoho offset format (e.g. 2026-10-09T13:22:05-0400).'),
        purpose_of_use: z.string().optional().nullable().describe('Purpose of use configured for the item.'),
        vendor_name: z.string().optional().nullable().describe('Name of the preferred vendor of the item.'),
        length: z.union([z.string(), z.number()]).optional().nullable().describe('Length of the item in the configured dimension unit.'),
        width: z.union([z.string(), z.number()]).optional().nullable().describe('Width of the item in the configured dimension unit.'),
        height: z.union([z.string(), z.number()]).optional().nullable().describe('Height of the item in the configured dimension unit.'),
        weight: z.union([z.string(), z.number()]).optional().nullable().describe('Weight of the item in the configured weight unit.'),
        weight_unit: z.string().optional().nullable().describe('Unit used for the item weight, e.g. lb or kg.'),
        dimension_unit: z.string().optional().nullable().describe('Unit used for the item dimensions, e.g. in or cm.'),
        dimensions_with_unit: z.string().optional().nullable().describe('Formatted dimensions of the item including the unit.'),
        weight_with_unit: z.string().optional().nullable().describe('Formatted weight of the item including the unit.'),
        reorder_level: z.number().optional().nullable().describe('Stock level at which the item should be reordered.'),
        stock_on_hand: z.number().optional().nullable().describe('Quantity of the item currently in stock.'),
        is_taxable: z.boolean().optional().nullable().describe('Whether the item is taxable.'),
        hsn_or_sac: z.union([z.string(), z.number()]).optional().nullable().describe('HSN or SAC code of the item (India edition).'),
        unitkey_code: z.string().optional().nullable().describe('Unit key code of the item (Mexico edition).'),
        sat_item_key_code: z.string().optional().nullable().describe('SAT item key code of the item (Mexico edition).'),
        inventory_account_id: z.union([z.string(), z.number()]).optional().nullable().describe('Identifier of the inventory account.'),
        custom_fields: z.array(CustomFieldSchema).optional().nullable().describe('Custom fields configured on the item.')
    })
    .describe('An inventory item (product or service) from Zoho Inventory.');

const ProviderItemSchema = ItemSchema.omit({ id: true });

const CheckpointSchema = z
    .object({
        organization_id: z.string().describe('Organization the high-water mark belongs to; a checkpoint for another organization is ignored.'),
        updated_after: z
            .string()
            .describe('High-water mark of the last observed item last_modified_time, sent as the inclusive last_modified_time filter on the next run.')
    })
    .describe('Sync checkpoint holding the incremental last_modified_time filter for the items sync.');

const sync = createSync({
    description: 'Sync all inventory items (products/services) in the organization.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: OrganizationMetadataSchema,
    scopes: ['ZohoInventory.items.READ', 'ZohoInventory.settings.READ'],
    models: {
        Item: ItemSchema
    },

    exec: async (nango) => {
        const organizationId = await resolveSyncOrganizationId(nango);
        const checkpoint = CheckpointSchema.nullable().parse(await nango.getCheckpoint());
        // A high-water mark from another organization (metadata changed) would skip this organization's older items.
        const updatedAfter = checkpoint?.organization_id === organizationId ? checkpoint.updated_after : undefined;

        // Incremental sync: the last_modified_time keyset cursor (see paginateByLastModifiedTime) doubles as
        // the high-water mark, so an item edited mid-run is re-read later instead of being skipped. The API
        // exposes no deleted-items feed and the changed-only filter is incompatible with
        // trackDeletesStart/trackDeletesEnd, so deletions are intentionally not tracked by this sync.
        const pages = paginateByLastModifiedTime(nango, {
            // https://www.zoho.com/inventory/api/v1/items/#list-all-the-items
            endpoint: '/inventory/v1/items',
            responseKey: 'items',
            organizationId,
            start: { cursor: updatedAfter, page: 1 }
        });

        for await (const { records, next } of pages) {
            const items = records.map((raw) => {
                const item = ProviderItemSchema.parse(raw);
                return ItemSchema.parse({
                    ...item,
                    id: String(item.item_id)
                });
            });

            if (items.length > 0) {
                await nango.batchSave(items, 'Item');
            }

            if (next.cursor && next.cursor !== updatedAfter) {
                await nango.saveCheckpoint({ organization_id: organizationId, updated_after: next.cursor });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
