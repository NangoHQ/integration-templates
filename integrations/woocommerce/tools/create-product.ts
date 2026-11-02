import { z } from 'zod';
import { createTool } from 'nango';

const numericIdPattern = /^[1-9][0-9]*$/;
const parentIdPattern = /^[0-9]+$/;
const decimalStringPattern = /^([0-9]+(\.[0-9]+)?)?$/;

const ImageInputSchema = z
    .object({
        alt: z.string().optional().describe('Image alternative text.'),
        url: z.url().optional().describe('Image URL to import; use instead of mediaId.'),
        name: z.string().optional().describe('Image name.'),
        mediaId: z.string().regex(numericIdPattern).optional().describe('Existing media attachment ID; use instead of url.')
    })
    .meta({
        anyOf: [
            { not: { required: ['mediaId'] }, required: ['url'] },
            { not: { required: ['url'] }, required: ['mediaId'] }
        ]
    })
    .refine((image) => (image.mediaId !== undefined) !== (image.url !== undefined), { message: 'Provide exactly one of mediaId or url.' });

const DownloadInputSchema = z.object({
    id: z.string().optional().describe('Existing download file ID, if applicable.'),
    url: z.url().describe('Downloadable file URL.'),
    name: z.string().optional().describe('Customer-facing file name.')
});

const AttributeInputSchema = z
    .object({
        name: z.string().optional().describe('Local attribute name, or global attribute display name.'),
        options: z.array(z.string()).optional().describe('Available term names.'),
        visible: z.boolean().optional().describe('Whether shown on the product information tab.'),
        position: z.number().int().optional().describe('Attribute display position.'),
        variation: z.boolean().optional().describe('Whether usable in product variations.'),
        attributeId: z.string().regex(numericIdPattern).optional().describe('Existing global attribute ID; otherwise provide name for a local attribute.')
    })
    .meta({
        anyOf: [{ required: ['attributeId'] }, { required: ['name'] }]
    })
    .refine((attribute) => attribute.attributeId !== undefined || attribute.name !== undefined, { message: 'Provide attributeId or name.' });

const DefaultAttributeInputSchema = z
    .object({
        name: z.string().optional().describe('Attribute name for a local attribute.'),
        option: z.string().describe('Selected term name.'),
        attributeId: z.string().regex(numericIdPattern).optional().describe('Global attribute ID; otherwise identify the local attribute by name.')
    })
    .meta({
        anyOf: [{ required: ['attributeId'] }, { required: ['name'] }]
    })
    .refine((attribute) => attribute.attributeId !== undefined || attribute.name !== undefined, { message: 'Provide attributeId or name.' });

const DimensionsInputSchema = z.object({
    width: z.string().optional().describe('Product width; empty means unset.'),
    height: z.string().optional().describe('Product height; empty means unset.'),
    length: z.string().optional().describe('Product length; empty means unset.')
});

const MetadataEntryInputSchema = z.object({
    key: z.string().describe('Metadata key.'),
    value: z.string().describe('Metadata string value, preserved without interpretation.')
});

const InputSchema = z
    .object({
        sku: z.string().optional().describe('Unique store SKU; empty means unset.'),
        name: z.string().min(1).describe('New product name.'),
        slug: z.string().optional().describe('Requested product slug; omitted lets the store generate one.'),
        type: z.enum(['simple', 'grouped', 'external', 'variable']).optional().describe('Product type; omitted uses simple.'),
        images: z.array(ImageInputSchema).optional().describe('Ordered product images, using existing attachments or remote URLs.'),
        status: z.enum(['draft', 'pending', 'private', 'publish']).optional().describe('Initial lifecycle status; omitted uses publish.'),
        tagIds: z.array(z.string().regex(numericIdPattern)).optional().describe('Complete initial set of tag IDs.'),
        weight: z.string().optional().describe('Product weight in the store-configured weight unit; empty means unset.'),
        virtual: z.boolean().optional().describe('Whether the product is virtual.'),
        brandIds: z.array(z.string().regex(numericIdPattern)).optional().describe('Complete initial set of brand IDs.'),
        featured: z.boolean().optional().describe('Whether featured; provider default false.'),
        metadata: z.array(MetadataEntryInputSchema).optional().describe('Custom product metadata entries.'),
        parentId: z.string().regex(parentIdPattern).optional().describe('Parent product ID; zero means no parent.'),
        taxClass: z.string().optional().describe("Tax class slug; empty selects the store's standard class."),
        downloads: z.array(DownloadInputSchema).optional().describe('Downloadable file definitions.'),
        menuOrder: z.number().int().optional().describe('Custom catalog ordering position.'),
        salePrice: z.string().regex(decimalStringPattern).optional().describe('Exact decimal sale price in store currency, or empty for no sale price.'),
        taxStatus: z.enum(['taxable', 'shipping', 'none']).optional().describe('How taxes apply to this product.'),
        upsellIds: z.array(z.string().regex(numericIdPattern)).optional().describe('Related product IDs to offer as upsells.'),
        attributes: z.array(AttributeInputSchema).optional().describe('Complete initial attribute definitions.'),
        backorders: z.enum(['no', 'notify', 'yes']).optional().describe('Backorder policy when stock is managed.'),
        buttonText: z.string().optional().describe('External product purchase button text.'),
        dimensions: DimensionsInputSchema.optional().describe('Dimensions in the store-configured dimension unit.'),
        saleEndsAt: z.iso
            .datetime({ offset: true })
            .nullable()
            .optional()
            .describe('Sale end instant with explicit offset or Z; null leaves no scheduled end.'),
        categoryIds: z.array(z.string().regex(numericIdPattern)).optional().describe('Complete initial set of category IDs.'),
        description: z.string().optional().describe('Full product content as ordinary text or HTML.'),
        externalUrl: z.string().optional().describe('Purchase destination for external products; empty means unset.'),
        manageStock: z.boolean().optional().describe('Whether inventory is managed at product level.'),
        stockStatus: z.enum(['instock', 'outofstock', 'onbackorder']).optional().describe('Initial stock availability.'),
        crossSellIds: z.array(z.string().regex(numericIdPattern)).optional().describe('Related product IDs to offer as cross-sells.'),
        downloadable: z.boolean().optional().describe('Whether it includes downloadable files.'),
        purchaseNote: z.string().optional().describe('Note sent to the customer after purchase.'),
        regularPrice: z.string().regex(decimalStringPattern).optional().describe('Exact decimal regular price in store currency, or empty for unset.'),
        saleStartsAt: z.iso
            .datetime({ offset: true })
            .nullable()
            .optional()
            .describe('Sale start instant with explicit offset or Z; null leaves no scheduled start.'),
        downloadLimit: z.number().int().min(-1).optional().describe('Downloads permitted per purchase; -1 means unlimited.'),
        shippingClass: z.string().optional().describe('Shipping class slug; empty means no class.'),
        stockQuantity: z.number().int().nullable().optional().describe('Initial inventory count; null means unset where supported.'),
        globalUniqueId: z.string().optional().describe('GTIN, UPC, EAN or ISBN.'),
        reviewsAllowed: z.boolean().optional().describe('Whether customers can review the product.'),
        shortDescription: z.string().optional().describe('Short product content as ordinary text or HTML.'),
        soldIndividually: z.boolean().optional().describe('Whether only one unit may be bought in an order.'),
        catalogVisibility: z.enum(['visible', 'catalog', 'search', 'hidden']).optional().describe('Catalog and search visibility; provider default visible.'),
        defaultAttributes: z.array(DefaultAttributeInputSchema).optional().describe('Default selected variation attributes.'),
        groupedProductIds: z.array(z.string().regex(numericIdPattern)).optional().describe('Child product IDs of a grouped product.'),
        customsDescription: z
            .string()
            .max(35)
            .nullable()
            .optional()
            .describe('Optional customs plain text without emoji or special symbols; at most 35 characters.'),
        downloadExpiryDays: z.number().int().min(-1).optional().describe('Days of access after purchase; -1 means no expiry.'),
        customsCommodityCode: z
            .string()
            .nullable()
            .optional()
            .describe('Optional customs code; punctuation and spaces are removed by the provider, leaving 6–14 digits; letters are invalid.'),
        customsCountryOfOrigin: z.string().nullable().optional().describe('Optional two-letter ISO country code, normalized uppercase by the provider.')
    })
    .describe('Fields for creating one catalog product; omitted fields use the store defaults.');

const OutputSchema = z
    .object({
        id: z.string().describe('New store-scoped product ID.'),
        sku: z.string().optional().describe('Stored SKU, including empty when unset.'),
        url: z.string().optional().describe('Product permalink when returned.'),
        name: z.string().describe('Stored product name after provider processing.'),
        type: z.string().describe('Stored product type.'),
        status: z.string().optional().describe('Stored lifecycle status when returned.'),
        salePrice: z.string().optional().describe('Stored sale price as a decimal string, or empty when unset.'),
        regularPrice: z.string().optional().describe('Stored regular price as a decimal string, or empty when unset.')
    })
    .describe('Confirmed identity and key stored values of the created product.');

const ProviderProductSchema = z.object({
    id: z.union([z.number(), z.string()]),
    name: z.string().nullish(),
    type: z.string().nullish(),
    status: z.string().nullish(),
    sku: z.string().nullish(),
    permalink: z.string().nullish(),
    regular_price: z.string().nullish(),
    sale_price: z.string().nullish()
});

const ProviderErrorSchema = z.object({
    response: z
        .object({
            status: z.number().optional(),
            data: z
                .object({
                    code: z.string().optional(),
                    message: z.string().optional(),
                    data: z.object({ status: z.number().optional() }).optional()
                })
                .optional()
        })
        .optional(),
    message: z.string().optional()
});

interface ProductCreateBody {
    name: string;
    sku?: string;
    slug?: string;
    type?: string;
    status?: string;
    featured?: boolean;
    catalog_visibility?: string;
    description?: string;
    short_description?: string;
    global_unique_id?: string;
    regular_price?: string;
    sale_price?: string;
    date_on_sale_from_gmt?: string | null;
    date_on_sale_to_gmt?: string | null;
    virtual?: boolean;
    downloadable?: boolean;
    downloads?: { id?: string; file: string; name?: string }[];
    download_limit?: number;
    download_expiry?: number;
    external_url?: string;
    button_text?: string;
    tax_status?: string;
    tax_class?: string;
    manage_stock?: boolean;
    stock_quantity?: number | null;
    stock_status?: string;
    backorders?: string;
    sold_individually?: boolean;
    weight?: string;
    dimensions?: { width?: string; height?: string; length?: string };
    shipping_class?: string;
    reviews_allowed?: boolean;
    upsell_ids?: number[];
    cross_sell_ids?: number[];
    parent_id?: number;
    purchase_note?: string;
    categories?: { id: number }[];
    tags?: { id: number }[];
    brands?: { id: number }[];
    images?: { id?: number; src?: string; alt?: string; name?: string }[];
    attributes?: { id?: number; name?: string; options?: string[]; visible?: boolean; position?: number; variation?: boolean }[];
    default_attributes?: { id?: number; name?: string; option: string }[];
    grouped_products?: number[];
    menu_order?: number;
    meta_data?: { key: string; value: string }[];
    customs_description?: string | null;
    customs_commodity_code?: string | null;
    customs_country_of_origin?: string | null;
}

function toNumericId(value: string, field: string): number {
    const id = Number(value);
    if (!Number.isSafeInteger(id)) {
        throw new Error(`invalid_request: ${field} contains an ID that cannot be represented exactly.`);
    }
    return id;
}

function toGmtDateTime(value: string, field: string): string {
    const fraction = /T\d{2}:\d{2}:\d{2}\.(\d+)/.exec(value);
    if (fraction && fraction[1] !== undefined && Number(fraction[1]) !== 0) {
        throw new Error(`invalid_request: ${field} must not contain nonzero fractional seconds.`);
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`invalid_request: ${field} is not a valid date-time instant.`);
    }
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

function mapProviderError(err: unknown): Error {
    const parsed = ProviderErrorSchema.safeParse(err);
    const providerBody = parsed.success ? parsed.data.response?.data : undefined;
    const status = parsed.success ? (parsed.data.response?.status ?? providerBody?.data?.status) : undefined;
    const code = providerBody?.code;
    const message = providerBody?.message ?? (parsed.success ? parsed.data.message : undefined) ?? 'Unknown provider error.';

    if (code === 'product_invalid_sku') {
        return new Error(`conflict: ${message}`);
    }
    if (code !== undefined && /image|media|upload/i.test(code)) {
        return new Error(`media_import_failed: ${message}`);
    }
    switch (status) {
        case 400:
            return new Error(`invalid_request: ${message}`);
        case 401:
        case 403:
            return new Error(`permission_denied: ${message}`);
        case 404:
            return new Error(`not_found: ${message}`);
        case 409:
            return new Error(`conflict: ${message}`);
        default:
            break;
    }
    return new Error(`provider_error: ${message}`);
}

/**
 * @tags: [write]
 * @tagReason: Creates one catalog product in the store with a single provider write; the tool performs no reads or deletes.
 * @pitfalls: Omitting status publishes the product by default and omitting type creates a simple product. The store sanitizes and may reformat submitted content (e.g. descriptions come back HTML-wrapped), so returned values can differ from the request. Image URLs are imported by the store and may fail independently of the other fields, possibly leaving a partially created product. A repeated successful call creates another product, and creating a variable product does not create its variations.
 */
const tool = createTool({
    name: 'create-product',
    description: 'Create a simple, grouped, external or variable catalog product, including content, inventory, taxonomy, media and variation configuration.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use this to create one product; use `batch-update-products` for up to 100 mixed catalog changes. For an existing product use `update-product`; to duplicate one use `copy-product`. Category, tag, brand and media IDs must already belong to the store, or images may be supplied by URL. Creating a variable product configures its parent and attributes, not its individual variations. The store defaults new products to published unless status is supplied. Do not blindly retry a failed create when its outcome is unclear.',
        requiredScopes: [],
        tags: { read_only_hint: 'false', destructive_hint: 'false', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        if (input.saleStartsAt != null && input.saleEndsAt != null && new Date(input.saleEndsAt).getTime() < new Date(input.saleStartsAt).getTime()) {
            throw new Error('invalid_request: saleEndsAt is earlier than saleStartsAt.');
        }

        const data: ProductCreateBody = { name: input.name };
        if (input.sku !== undefined) data.sku = input.sku;
        if (input.slug !== undefined) data.slug = input.slug;
        if (input.type !== undefined) data.type = input.type;
        if (input.status !== undefined) data.status = input.status;
        if (input.featured !== undefined) data.featured = input.featured;
        if (input.catalogVisibility !== undefined) data.catalog_visibility = input.catalogVisibility;
        if (input.description !== undefined) data.description = input.description;
        if (input.shortDescription !== undefined) data.short_description = input.shortDescription;
        if (input.globalUniqueId !== undefined) data.global_unique_id = input.globalUniqueId;
        if (input.regularPrice !== undefined) data.regular_price = input.regularPrice;
        if (input.salePrice !== undefined) data.sale_price = input.salePrice;
        if (input.saleStartsAt !== undefined)
            data.date_on_sale_from_gmt = input.saleStartsAt === null ? null : toGmtDateTime(input.saleStartsAt, 'saleStartsAt');
        if (input.saleEndsAt !== undefined) data.date_on_sale_to_gmt = input.saleEndsAt === null ? null : toGmtDateTime(input.saleEndsAt, 'saleEndsAt');
        if (input.virtual !== undefined) data.virtual = input.virtual;
        if (input.downloadable !== undefined) data.downloadable = input.downloadable;
        if (input.downloadLimit !== undefined) data.download_limit = input.downloadLimit;
        if (input.downloadExpiryDays !== undefined) data.download_expiry = input.downloadExpiryDays;
        if (input.externalUrl !== undefined) data.external_url = input.externalUrl;
        if (input.buttonText !== undefined) data.button_text = input.buttonText;
        if (input.taxStatus !== undefined) data.tax_status = input.taxStatus;
        if (input.taxClass !== undefined) data.tax_class = input.taxClass;
        if (input.manageStock !== undefined) data.manage_stock = input.manageStock;
        if (input.stockQuantity !== undefined) data.stock_quantity = input.stockQuantity;
        if (input.stockStatus !== undefined) data.stock_status = input.stockStatus;
        if (input.backorders !== undefined) data.backorders = input.backorders;
        if (input.soldIndividually !== undefined) data.sold_individually = input.soldIndividually;
        if (input.weight !== undefined) data.weight = input.weight;
        if (input.shippingClass !== undefined) data.shipping_class = input.shippingClass;
        if (input.reviewsAllowed !== undefined) data.reviews_allowed = input.reviewsAllowed;
        if (input.purchaseNote !== undefined) data.purchase_note = input.purchaseNote;
        if (input.menuOrder !== undefined) data.menu_order = input.menuOrder;
        if (input.customsDescription !== undefined) data.customs_description = input.customsDescription;
        if (input.customsCommodityCode !== undefined) data.customs_commodity_code = input.customsCommodityCode;
        if (input.customsCountryOfOrigin !== undefined) data.customs_country_of_origin = input.customsCountryOfOrigin;

        if (input.parentId !== undefined) data.parent_id = toNumericId(input.parentId, 'parentId');
        if (input.upsellIds !== undefined) data.upsell_ids = input.upsellIds.map((id) => toNumericId(id, 'upsellIds'));
        if (input.crossSellIds !== undefined) data.cross_sell_ids = input.crossSellIds.map((id) => toNumericId(id, 'crossSellIds'));
        if (input.groupedProductIds !== undefined) data.grouped_products = input.groupedProductIds.map((id) => toNumericId(id, 'groupedProductIds'));
        if (input.categoryIds !== undefined) data.categories = input.categoryIds.map((id) => ({ id: toNumericId(id, 'categoryIds') }));
        if (input.tagIds !== undefined) data.tags = input.tagIds.map((id) => ({ id: toNumericId(id, 'tagIds') }));
        if (input.brandIds !== undefined) data.brands = input.brandIds.map((id) => ({ id: toNumericId(id, 'brandIds') }));

        if (input.dimensions !== undefined) {
            const dimensions: { width?: string; height?: string; length?: string } = {};
            if (input.dimensions.width !== undefined) dimensions.width = input.dimensions.width;
            if (input.dimensions.height !== undefined) dimensions.height = input.dimensions.height;
            if (input.dimensions.length !== undefined) dimensions.length = input.dimensions.length;
            data.dimensions = dimensions;
        }

        if (input.images !== undefined) {
            data.images = input.images.map((image) => {
                const mapped: { id?: number; src?: string; alt?: string; name?: string } = {};
                if (image.mediaId !== undefined) {
                    mapped.id = toNumericId(image.mediaId, 'images.mediaId');
                } else if (image.url !== undefined) {
                    mapped.src = image.url;
                }
                if (image.alt !== undefined) mapped.alt = image.alt;
                if (image.name !== undefined) mapped.name = image.name;
                return mapped;
            });
        }

        if (input.downloads !== undefined) {
            data.downloads = input.downloads.map((download) => {
                const mapped: { id?: string; file: string; name?: string } = { file: download.url };
                if (download.id !== undefined) mapped.id = download.id;
                if (download.name !== undefined) mapped.name = download.name;
                return mapped;
            });
        }

        if (input.attributes !== undefined) {
            data.attributes = input.attributes.map((attribute) => {
                const mapped: { id?: number; name?: string; options?: string[]; visible?: boolean; position?: number; variation?: boolean } = {};
                if (attribute.attributeId !== undefined) mapped.id = toNumericId(attribute.attributeId, 'attributes.attributeId');
                if (attribute.name !== undefined) mapped.name = attribute.name;
                if (attribute.options !== undefined) mapped.options = attribute.options;
                if (attribute.visible !== undefined) mapped.visible = attribute.visible;
                if (attribute.position !== undefined) mapped.position = attribute.position;
                if (attribute.variation !== undefined) mapped.variation = attribute.variation;
                return mapped;
            });
        }

        if (input.defaultAttributes !== undefined) {
            data.default_attributes = input.defaultAttributes.map((attribute) => {
                const mapped: { id?: number; name?: string; option: string } = { option: attribute.option };
                if (attribute.attributeId !== undefined) mapped.id = toNumericId(attribute.attributeId, 'defaultAttributes.attributeId');
                if (attribute.name !== undefined) mapped.name = attribute.name;
                return mapped;
            });
        }

        if (input.metadata !== undefined) {
            data.meta_data = input.metadata.map((entry) => ({ key: entry.key, value: entry.value }));
        }

        let response;
        // @allowTryCatch: The documented WooCommerce error body ({code, message, data.status}) must be mapped to the tool's public error codes.
        try {
            // https://developer.woocommerce.com/docs/apis/rest-api/v3/products
            response = await nango.post({
                endpoint: '/wp-json/wc/v3/products',
                data,
                // Product creation is not idempotent: retrying a lost response would create a duplicate product.
                retries: 0
            });
        } catch (err) {
            throw mapProviderError(err);
        }

        const parsed = ProviderProductSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error('write_result_unknown: The create response did not contain a recognizable product.');
        }
        const product = parsed.data;
        if (typeof product.id === 'number' && !Number.isSafeInteger(product.id)) {
            throw new Error('write_result_unknown: The create response contained a product ID that cannot be represented exactly.');
        }
        const id = String(product.id);
        if (id === '' || product.name == null || product.type == null) {
            throw new Error('write_result_unknown: The create response did not include the product identity and stored values.');
        }

        return {
            id,
            name: product.name,
            type: product.type,
            ...(product.status != null && { status: product.status }),
            ...(product.sku != null && { sku: product.sku }),
            ...(product.permalink != null && { url: product.permalink }),
            ...(product.regular_price != null && { regularPrice: product.regular_price }),
            ...(product.sale_price != null && { salePrice: product.sale_price })
        };
    }
});

export default tool;
