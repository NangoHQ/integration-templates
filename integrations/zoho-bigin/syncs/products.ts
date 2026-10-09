import { createSync } from 'nango';
import { z } from 'zod';

const PRODUCTS_ENDPOINT = '/bigin/v2/Products';
const PRODUCTS_SEARCH_ENDPOINT = '/bigin/v2/Products/search';
const PAGE_SIZE = 200;
const LOOKBACK_BUFFER_MS = 5 * 60 * 1000;
const FULL_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const PRODUCT_FIELDS = [
    'id',
    'Product_Name',
    'Product_Code',
    'Product_Category',
    'Product_Active',
    'Unit_Price',
    'Taxable',
    'Description',
    'Manufacturer',
    'Usage_Unit',
    'Qty_in_Stock',
    'Qty_Ordered',
    'Qty_in_Demand',
    'Reorder_Level',
    'Commission_Rate',
    'Sales_Start_Date',
    'Sales_End_Date',
    'Support_Start_Date',
    'Support_Expiry_Date',
    'Last_Activity_Time',
    'Handler',
    'Owner',
    'Created_By',
    'Modified_By',
    'Tag',
    'Created_Time',
    'Modified_Time',
    'Record_Image'
].join(',');

const UserRefSchema = z
    .object({
        name: z.string().nullable().optional().describe('Display name of the Bigin user. Example: Nango Developer'),
        id: z.string().describe('Unique id of the Bigin user. Example: 7618134000000627001'),
        email: z.string().nullable().optional().describe('Email address of the Bigin user. Example: api@nango.dev')
    })
    .describe('A reference to a Bigin user, used by the owner, creator, modifier and handler fields.');

const TagSchema = z
    .object({
        name: z.string().describe('Name of the tag. Example: nango-test'),
        id: z.string().describe('Unique id of the tag. Example: 7618134000000646028'),
        color_code: z.string().nullable().optional().describe('Optional UI color code assigned to the tag.')
    })
    .describe('A tag attached to a product.');

const ProductSchema = z
    .object({
        id: z.string().describe('Unique product id. Example: 7618134000000647020'),
        Product_Name: z.string().describe('Name of the product. Example: Nango Test Product'),
        Product_Code: z.string().nullable().optional().describe('SKU or product code. Example: NTP-001'),
        Product_Category: z.string().nullable().optional().describe('Category the product belongs to. Example: Software'),
        Product_Active: z.boolean().optional().describe('Whether the product is active.'),
        Unit_Price: z.number().nullable().optional().describe('Selling price per unit. Example: 42.5'),
        Taxable: z.boolean().optional().describe('Whether the product is taxable.'),
        Description: z.string().nullable().optional().describe('Free-form description of the product.'),
        Manufacturer: z.string().nullable().optional().describe('Manufacturer of the product.'),
        Usage_Unit: z.string().nullable().optional().describe('Unit used to measure product usage.'),
        Qty_in_Stock: z.number().nullable().optional().describe('Quantity of the product currently in stock.'),
        Qty_Ordered: z.number().nullable().optional().describe('Quantity of the product currently on order.'),
        Qty_in_Demand: z.number().nullable().optional().describe('Quantity of the product currently in demand.'),
        Reorder_Level: z.number().nullable().optional().describe('Stock level at which the product should be reordered.'),
        Commission_Rate: z.number().nullable().optional().describe('Sales commission rate for the product.'),
        Sales_Start_Date: z.string().nullable().optional().describe('Date from which the product is on sale (YYYY-MM-DD).'),
        Sales_End_Date: z.string().nullable().optional().describe('Date until which the product is on sale (YYYY-MM-DD).'),
        Support_Start_Date: z.string().nullable().optional().describe('Date from which product support starts (YYYY-MM-DD).'),
        Support_Expiry_Date: z.string().nullable().optional().describe('Date on which product support expires (YYYY-MM-DD).'),
        Last_Activity_Time: z.string().nullable().optional().describe('Timestamp of the last activity recorded on the product.'),
        Handler: UserRefSchema.nullable().optional().describe('Bigin user responsible for handling the product.'),
        Owner: UserRefSchema.nullable().optional().describe('Bigin user who owns the product.'),
        Created_By: UserRefSchema.nullable().optional().describe('Bigin user who created the product.'),
        Modified_By: UserRefSchema.nullable().optional().describe('Bigin user who last modified the product.'),
        Tag: z.array(TagSchema).optional().describe('Tags attached to the product.'),
        Created_Time: z.string().optional().describe('Timestamp when the product was created. Example: 2026-10-09T22:07:44+03:00'),
        Modified_Time: z.string().optional().describe('Timestamp when the product was last modified. Example: 2026-10-09T22:09:24+03:00'),
        Record_Image: z.string().nullable().optional().describe('Reference to the product image, if any.')
    })
    .describe('A product record from the Bigin Products module.');

const CheckpointSchema = z.object({
    updated_after: z.string().describe('High-water mark of the last product Modified_Time synced, used as the cursor for the next incremental search.'),
    last_full_refresh: z.string().describe('ISO-8601 timestamp of the last completed full Products scan used for deletion detection.'),
    full_refresh_started_at: z.string().describe('ISO-8601 timestamp when the current delete-tracked full Products scan first began.'),
    full_refresh_page_token: z.string().describe('Opaque page token used to resume a full Products scan.'),
    full_refresh_page_token_expiry: z.string().describe('ISO-8601 timestamp when the saved full_refresh_page_token expires, when Bigin provides one.')
});

const ProductInfoSchema = z.object({
    count: z.number().nullable().optional(),
    page: z.number().nullable().optional(),
    per_page: z.number().nullable().optional(),
    more_records: z.boolean().nullable().optional(),
    next_page_token: z.string().nullable().optional(),
    page_token_expiry: z.string().nullable().optional()
});

const ProductResponseSchema = z.object({
    data: z.array(z.unknown()).nullable().optional(),
    info: ProductInfoSchema.nullable().optional()
});

type Product = z.infer<typeof ProductSchema>;

function toBiginDateTime(date: Date): string {
    return `${date.toISOString().slice(0, 19)}+00:00`;
}

function shouldUseSavedPageToken(pageToken: string | undefined, pageTokenExpiry: string | undefined, now: Date): boolean {
    if (!pageToken) {
        return false;
    }

    if (!pageTokenExpiry) {
        return true;
    }

    const expiryMs = Date.parse(pageTokenExpiry);
    return Number.isNaN(expiryMs) || expiryMs > now.getTime();
}

function parseProductsResponse(response: { status: number; data: unknown }): {
    products: Product[];
    moreRecords: boolean;
    nextPageToken: string | undefined;
    pageTokenExpiry: string | undefined;
} {
    if (response.status === 204 || response.data === '' || response.data === null || response.data === undefined) {
        return { products: [], moreRecords: false, nextPageToken: undefined, pageTokenExpiry: undefined };
    }

    const parsed = ProductResponseSchema.parse(response.data);

    return {
        products: (parsed.data ?? []).map((product) => ProductSchema.parse(product)),
        moreRecords: parsed.info?.more_records ?? false,
        nextPageToken: parsed.info?.next_page_token ?? undefined,
        pageTokenExpiry: parsed.info?.page_token_expiry ?? undefined
    };
}

function trackLatestModified(
    products: Product[],
    current: { time: string | undefined; ms: number | undefined }
): { time: string | undefined; ms: number | undefined } {
    let time = current.time;
    let ms = current.ms;
    for (const product of products) {
        if (!product.Modified_Time) {
            continue;
        }
        const parsed = Date.parse(product.Modified_Time);
        if (Number.isNaN(parsed)) {
            continue;
        }
        if (ms === undefined || parsed > ms) {
            ms = parsed;
            time = product.Modified_Time;
        }
    }
    return { time, ms };
}

async function syncIncrementalProducts(
    nango: NangoSyncLocal,
    updatedAfter: string,
    latest: { time: string | undefined; ms: number | undefined }
): Promise<{ time: string | undefined; ms: number | undefined }> {
    const lookbackMs = Date.parse(updatedAfter) - LOOKBACK_BUFFER_MS;
    if (Number.isNaN(lookbackMs)) {
        throw new Error(`Invalid checkpoint updated_after value: ${updatedAfter}`);
    }

    const criteria = `(Modified_Time:greater_than:${toBiginDateTime(new Date(lookbackMs))})`;
    let page = 1;

    while (true) {
        // https://www.bigin.com/developer/docs/apis/v2/search-records.html
        const response = await nango.get<unknown>({
            endpoint: PRODUCTS_SEARCH_ENDPOINT,
            params: {
                criteria,
                page,
                per_page: PAGE_SIZE
            },
            retries: 3
        });

        const { products, moreRecords } = parseProductsResponse(response);

        if (products.length > 0) {
            await nango.batchSave(products, 'Product');
            latest = trackLatestModified(products, latest);
        }

        if (!moreRecords) {
            return latest;
        }

        page += 1;
    }
}

const sync = createSync({
    description: 'Sync all products in the Bigin org, incrementally where possible.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Product: ProductSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse({
            updated_after: '',
            last_full_refresh: '',
            full_refresh_started_at: '',
            full_refresh_page_token: '',
            full_refresh_page_token_expiry: '',
            ...((await nango.getCheckpoint()) ?? {})
        });
        const updatedAfter = checkpoint.updated_after !== '' ? checkpoint.updated_after : undefined;
        const lastFullRefreshValue = checkpoint.last_full_refresh !== '' ? checkpoint.last_full_refresh : undefined;
        const fullRefreshStartedAtCheckpoint = checkpoint.full_refresh_started_at !== '' ? checkpoint.full_refresh_started_at : undefined;
        const fullRefreshPageToken = checkpoint.full_refresh_page_token !== '' ? checkpoint.full_refresh_page_token : undefined;
        const fullRefreshPageTokenExpiry = checkpoint.full_refresh_page_token_expiry !== '' ? checkpoint.full_refresh_page_token_expiry : undefined;
        const runStartedAt = new Date();
        const fullRefreshInProgress = fullRefreshStartedAtCheckpoint !== undefined;
        const lastFullRefreshMs = lastFullRefreshValue ? Date.parse(lastFullRefreshValue) : Number.NaN;
        const fullRefreshDue =
            fullRefreshInProgress ||
            updatedAfter === undefined ||
            !Number.isFinite(lastFullRefreshMs) ||
            runStartedAt.getTime() - lastFullRefreshMs >= FULL_REFRESH_INTERVAL_MS;

        let latest: { time: string | undefined; ms: number | undefined } = {
            time: updatedAfter,
            ms: updatedAfter !== undefined ? Date.parse(updatedAfter) : undefined
        };

        if (fullRefreshDue) {
            // Deletions can only be reconciled from the plain list endpoint. Incremental
            // `/search` passes run between these scans, but a periodic full walk is still
            // required because deleted products simply disappear from search results.
            await nango.trackDeletesStart('Product');

            let fullRefreshStartedAt = fullRefreshStartedAtCheckpoint ?? runStartedAt.toISOString();
            const usingSavedPageToken = shouldUseSavedPageToken(fullRefreshPageToken, fullRefreshPageTokenExpiry, runStartedAt);
            let pageToken = usingSavedPageToken ? fullRefreshPageToken : undefined;

            if (fullRefreshPageToken !== undefined && !usingSavedPageToken) {
                // Restart the scan from the beginning if the saved token has expired.
                fullRefreshStartedAt = runStartedAt.toISOString();
            }

            while (true) {
                // https://www.bigin.com/developer/docs/apis/v2/get-records.html
                const response = await nango.get<unknown>({
                    endpoint: PRODUCTS_ENDPOINT,
                    params: {
                        fields: PRODUCT_FIELDS,
                        per_page: PAGE_SIZE,
                        ...(pageToken ? { page_token: pageToken } : {})
                    },
                    retries: 3
                });

                const { products, moreRecords, nextPageToken, pageTokenExpiry } = parseProductsResponse(response);

                if (products.length > 0) {
                    await nango.batchSave(products, 'Product');
                }

                if (!moreRecords) {
                    break;
                }

                if (!nextPageToken) {
                    throw new Error('Bigin Products list returned more_records without a next_page_token.');
                }

                pageToken = nextPageToken;

                await nango.saveCheckpoint({
                    updated_after: updatedAfter ?? '',
                    last_full_refresh: lastFullRefreshValue ?? '',
                    full_refresh_started_at: fullRefreshStartedAt,
                    full_refresh_page_token: pageToken,
                    full_refresh_page_token_expiry: pageTokenExpiry ?? ''
                });
            }

            // Close the delete-tracking window only after the full scan cursor has been cleared.
            await nango.clearCheckpoint();
            await nango.trackDeletesEnd('Product');
            await nango.saveCheckpoint({
                updated_after: fullRefreshStartedAt,
                last_full_refresh: new Date().toISOString(),
                full_refresh_started_at: '',
                full_refresh_page_token: '',
                full_refresh_page_token_expiry: ''
            });
            return;
        }

        if (updatedAfter === undefined || lastFullRefreshValue === undefined) {
            throw new Error('Products incremental sync requires an existing updated_after and last_full_refresh checkpoint.');
        }

        // Incremental path. The Bigin search index lags writes by roughly 10-20s,
        // so query with a lookback buffer and rely on idempotent upserts to avoid gaps.
        latest = await syncIncrementalProducts(nango, updatedAfter, latest);

        await nango.saveCheckpoint({
            updated_after: latest.time ?? updatedAfter,
            last_full_refresh: lastFullRefreshValue,
            full_refresh_started_at: '',
            full_refresh_page_token: '',
            full_refresh_page_token_expiry: ''
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
