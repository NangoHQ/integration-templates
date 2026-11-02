import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const BundleItemSchema = z
    .object({
        itemId: z.string().describe('Component item ID.'),
        itemType: z.string().optional().describe('Component catalog type.'),
        quantity: z.number().int().optional().describe('Whole-unit component quantity.'),
        priceAllocation: z.number().optional().describe('Allocation percentage on 0–100 provider scale.')
    })
    .describe('Component membership of a bundle plan item.');

const ItemSchema = z
    .object({
        id: z.string().describe('Catalog item ID.'),
        name: z.string().describe('Internal item name.'),
        type: z.string().describe('Plan/addon/charge type.'),
        status: z.string().optional().describe('Active/archived/deleted state.'),
        deleted: z.boolean().describe('Provider deletion marker.'),
        metered: z.boolean().optional().describe('Whether usage determines quantity.'),
        updatedAt: z.iso.datetime({ offset: true }).optional().describe('Last update instant in UTC.'),
        bundleItems: z.array(BundleItemSchema).optional().describe('Bundle associations when returned.'),
        description: z.string().optional().describe('Stored internal HTML/text preserving Unicode.'),
        itemFamilyId: z.string().optional().describe('Parent family ID.'),
        enabledInPortal: z.boolean().optional().describe('Plan portal availability.'),
        businessEntityId: z.string().optional().describe('Entity owner, absent for shared item.'),
        enabledForCheckout: z.boolean().optional().describe('Plan checkout availability.')
    })
    .describe('Chargebee catalog item (plan, addon, or charge) with family reference, availability flags, and bundle membership.');

// Checkpoint fields must be plain z.string()/z.number()/z.boolean() (SDK constraint), so
// "absent" is encoded with sentinels: updated_after = 0 (unfiltered window) and offset = ''
// (no resume cursor). Reads go through CheckpointSchema.partial() so both are optional again.
const CheckpointSchema = z.object({
    updated_after: z.number().int(),
    offset: z.string()
});

const ChargebeeBundleItemSchema = z.object({
    item_id: z.string(),
    item_type: z.string().optional().nullable(),
    quantity: z.number().int().optional().nullable(),
    price_allocation: z.number().optional().nullable()
});

const ChargebeeItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    status: z.string().optional().nullable(),
    deleted: z.boolean(),
    metered: z.boolean(),
    updated_at: z.number().int().optional().nullable(),
    description: z.string().optional().nullable(),
    item_family_id: z.string().optional().nullable(),
    enabled_in_portal: z.boolean(),
    enabled_for_checkout: z.boolean(),
    business_entity_id: z.string().optional().nullable(),
    bundle_items: z.array(ChargebeeBundleItemSchema).optional().nullable()
});

const ChargebeeListEntrySchema = z.object({
    item: ChargebeeItemSchema
});

type Item = z.infer<typeof ItemSchema>;
type ChargebeeItem = z.infer<typeof ChargebeeItemSchema>;

function toUtcDateTime(unixSeconds: number): string {
    // Input is whole seconds, so the ISO fraction is always ".000"; drop it.
    return new Date(unixSeconds * 1000).toISOString().replace(/\.000Z$/, 'Z');
}

function toItem(item: ChargebeeItem): Item {
    return {
        id: item.id,
        name: item.name,
        type: item.type,
        deleted: item.deleted,
        metered: item.metered,
        enabledInPortal: item.enabled_in_portal,
        enabledForCheckout: item.enabled_for_checkout,
        ...(item.status != null && { status: item.status }),
        ...(item.updated_at != null && { updatedAt: toUtcDateTime(item.updated_at) }),
        ...(item.description != null && { description: item.description }),
        ...(item.item_family_id != null && { itemFamilyId: item.item_family_id }),
        ...(item.business_entity_id != null && { businessEntityId: item.business_entity_id }),
        ...(item.bundle_items != null && {
            bundleItems: item.bundle_items.map((bundleItem) => ({
                itemId: bundleItem.item_id,
                ...(bundleItem.item_type != null && { itemType: bundleItem.item_type }),
                ...(bundleItem.quantity != null && { quantity: bundleItem.quantity }),
                ...(bundleItem.price_allocation != null && { priceAllocation: bundleItem.price_allocation })
            }))
        })
    };
}

const sync = createSync({
    description: 'Make item identities, catalog types, family references, availability and bundle membership available as replicated records.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Item: ItemSchema
    },

    exec: async (nango) => {
        // Incremental strategy: `updated_at[after]` (UTC seconds) plus `sort_by[asc]=updated_at`
        // walks only changed items. Deletions are not removed: Chargebee keeps deleted items in
        // this list with `deleted: true` / `status: deleted`, and the contract replicates that
        // marker on the record, so deleted rows arrive through the same changed-since window.
        // The `offset` cursor resumes a window scan that exceeds the execution window; it is
        // dropped once the window completes and the high-water mark advances.
        const parsedCheckpoint = CheckpointSchema.partial().safeParse(await nango.getCheckpoint());
        const checkpoint = parsedCheckpoint.success ? parsedCheckpoint.data : {};
        const updatedAfter = checkpoint.updated_after ? checkpoint.updated_after : undefined;
        let offset = checkpoint.offset ? checkpoint.offset : undefined;
        let maxUpdatedAt: number | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://apidocs.chargebee.com/docs/api/items/list-items
            endpoint: '/api/v2/items',
            params: {
                'sort_by[asc]': 'updated_at',
                ...(updatedAfter !== undefined && { 'updated_at[after]': updatedAfter }),
                ...(offset !== undefined && { offset })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'next_offset',
                response_path: 'list',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    offset = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const entries = z.array(ChargebeeListEntrySchema).parse(page);
            const items = entries.map((entry) => toItem(entry.item));

            if (items.length > 0) {
                await nango.batchSave(items, 'Item');
            }

            for (const entry of entries) {
                const updatedAt = entry.item.updated_at;
                if (updatedAt != null && (maxUpdatedAt === undefined || updatedAt > maxUpdatedAt)) {
                    maxUpdatedAt = updatedAt;
                }
            }

            // At this point `offset` still holds the cursor that produced this page
            // (on_page runs after the loop body), so a crash mid-window re-fetches at
            // most this one page; batchSave upserts keep that idempotent.
            await nango.saveCheckpoint({
                updated_after: updatedAfter ?? 0,
                offset: offset ?? ''
            });
        }

        if (maxUpdatedAt !== undefined) {
            // Window complete: advance the high-water mark and clear the resume cursor.
            await nango.saveCheckpoint({ updated_after: maxUpdatedAt, offset: '' });
        } else if (offset !== undefined || checkpoint.offset) {
            // A resumed window returned no rows at all: drop the stale cursor so the
            // next run restarts this window from its first page instead of spinning on it.
            await nango.saveCheckpoint({ updated_after: updatedAfter ?? 0, offset: '' });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
