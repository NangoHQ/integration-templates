import { z } from 'zod';
import { createAction } from 'nango';

// Bigin rejects page-number requests that reach past the first 2000 records; only page_token can go further.
const PAGE_WINDOW_LIMIT = 2000;

const PRODUCT_FIELDS: string[] = [
    'id',
    'Product_Name',
    'Product_Code',
    'Product_Active',
    'Product_Category',
    'Unit_Price',
    'Description',
    'Tag',
    'Owner',
    'Created_By',
    'Modified_By',
    'Created_Time',
    'Modified_Time',
    'Record_Image'
];

const UserSchema = z.object({
    name: z.string().optional().describe('Display name of the user. Example: "Nango Developer".'),
    id: z.string().optional().describe('Unique identifier of the user. Example: "7618134000000627001".'),
    email: z.string().optional().describe('Email address of the user. Example: "api@nango.dev".')
});

const TagSchema = z.object({
    name: z.string().optional().describe('Tag name. Example: "TestTag".'),
    id: z.string().optional().describe('Unique identifier of the tag.'),
    color_code: z.string().optional().describe('Hex color code assigned to the tag, if any.')
});

const ProductSchema = z.object({
    id: z.string().describe('Unique identifier of the product record. Example: "7618134000000648048".'),
    Product_Name: z.string().optional().describe('Name of the product.'),
    Product_Code: z.string().optional().describe('Product code or stock keeping unit.'),
    Product_Active: z.boolean().optional().describe('Whether the product is active.'),
    Product_Category: z.string().optional().describe('Category the product belongs to.'),
    Unit_Price: z.number().optional().describe('Unit price of the product.'),
    Description: z.string().optional().describe('Description of the product.'),
    Tag: z.array(TagSchema).optional().describe('Tags attached to the product.'),
    Owner: UserSchema.optional().describe('User who owns the product record.'),
    Created_By: UserSchema.optional().describe('User who created the product record.'),
    Modified_By: UserSchema.optional().describe('User who last modified the product record.'),
    Created_Time: z.string().optional().describe('ISO 8601 timestamp when the product record was created.'),
    Modified_Time: z.string().optional().describe('ISO 8601 timestamp when the product record was last modified.'),
    Record_Image: z.string().optional().describe('URL of the product image, if any.')
});

const InputSchema = z
    .object({
        contact_id: z.string().min(1).describe('Unique identifier of the contact whose linked products should be listed. Example: "7618134000000647073".'),
        page: z.number().int().positive().optional().describe('Page number of linked products to retrieve, starting at 1. Defaults to 1.'),
        per_page: z
            .number()
            .int()
            .positive()
            .max(200)
            .optional()
            .describe('Number of linked products to return per page (1-200). Defaults to 200. Ignored with page_token, which encodes its page size.'),
        page_token: z
            .string()
            .min(1)
            .optional()
            .describe('next_page_token from a previous response, used to continue past the first 2000 records. Cannot be combined with page.')
    })
    .describe('Identifies the contact whose linked products should be listed, with optional pagination.');

const OutputSchema = z
    .object({
        products: z.array(ProductSchema).describe('Products currently linked to the contact. Empty when the contact has no linked products.'),
        count: z.number().int().describe('Number of linked products returned on this page.'),
        has_more: z.boolean().describe('Whether more linked products are available on a subsequent page.'),
        next_page: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Page number to request next. Only present when has_more is true and the next page is within the first 2000 records.'),
        next_page_token: z.string().optional().describe('Token to pass as page_token to fetch the next page, when has_more is true.')
    })
    .describe('A page of products linked to the requested contact, with pagination state.');

const RawUserSchema = z.object({
    name: z.string().nullish(),
    id: z.string().nullish(),
    email: z.string().nullish()
});

const RawTagSchema = z.object({
    name: z.string().nullish(),
    id: z.string().nullish(),
    color_code: z.string().nullish()
});

const RawProductSchema = z.object({
    id: z.string(),
    Product_Name: z.string().nullish(),
    Product_Code: z.string().nullish(),
    Product_Active: z.boolean().nullish(),
    Product_Category: z.string().nullish(),
    Unit_Price: z.number().nullish(),
    Description: z.string().nullish(),
    Tag: z.array(RawTagSchema).nullish(),
    Owner: RawUserSchema.nullish(),
    Created_By: RawUserSchema.nullish(),
    Modified_By: RawUserSchema.nullish(),
    Created_Time: z.string().nullish(),
    Modified_Time: z.string().nullish(),
    Record_Image: z.string().nullish()
});

const RawInfoSchema = z.object({
    count: z.number().nullish(),
    page: z.number().nullish(),
    per_page: z.number().nullish(),
    more_records: z.boolean().nullish(),
    next_page_token: z.string().nullish()
});

const RawResponseSchema = z.object({
    data: z.array(RawProductSchema).nullish(),
    info: RawInfoSchema.nullish()
});

function normalizeUser(raw: z.infer<typeof RawUserSchema>): z.infer<typeof UserSchema> {
    return {
        ...(raw.name != null && { name: raw.name }),
        ...(raw.id != null && { id: raw.id }),
        ...(raw.email != null && { email: raw.email })
    };
}

function normalizeTag(raw: z.infer<typeof RawTagSchema>): z.infer<typeof TagSchema> {
    return {
        ...(raw.name != null && { name: raw.name }),
        ...(raw.id != null && { id: raw.id }),
        ...(raw.color_code != null && { color_code: raw.color_code })
    };
}

function normalizeProduct(raw: z.infer<typeof RawProductSchema>): z.infer<typeof ProductSchema> {
    return {
        id: raw.id,
        ...(raw.Product_Name != null && { Product_Name: raw.Product_Name }),
        ...(raw.Product_Code != null && { Product_Code: raw.Product_Code }),
        ...(raw.Product_Active != null && { Product_Active: raw.Product_Active }),
        ...(raw.Product_Category != null && { Product_Category: raw.Product_Category }),
        ...(raw.Unit_Price != null && { Unit_Price: raw.Unit_Price }),
        ...(raw.Description != null && { Description: raw.Description }),
        ...(raw.Tag != null && { Tag: raw.Tag.map(normalizeTag) }),
        ...(raw.Owner != null && { Owner: normalizeUser(raw.Owner) }),
        ...(raw.Created_By != null && { Created_By: normalizeUser(raw.Created_By) }),
        ...(raw.Modified_By != null && { Modified_By: normalizeUser(raw.Modified_By) }),
        ...(raw.Created_Time != null && { Created_Time: raw.Created_Time }),
        ...(raw.Modified_Time != null && { Modified_Time: raw.Modified_Time }),
        ...(raw.Record_Image != null && { Record_Image: raw.Record_Image })
    };
}

/**
 * @tags: [read]
 * @tagReason: Reads the products linked to a contact; no provider data is created, updated, or deleted.
 * @pitfalls: A contact with no linked products returns an empty products array rather than an error, while an invalid or non-existent contact id fails with a provider error instead of an empty list.
 */
const action = createAction({
    description: 'List all products currently linked (associated) to a given contact.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.modules.contacts.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.page !== undefined && input.page_token !== undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide either page or page_token, not both.'
            });
        }

        const response = await nango.get({
            // https://www.bigin.com/developer/docs/apis/get-related-records.html
            endpoint: `/bigin/v2/Contacts/${encodeURIComponent(input.contact_id)}/Products`,
            params: {
                fields: PRODUCT_FIELDS.join(','),
                // The page size is encoded in the token; Bigin ignores a token sent with a different per_page.
                ...(input.page_token !== undefined ? { page_token: input.page_token } : { page: input.page ?? 1, per_page: input.per_page ?? 200 })
            },
            retries: 3
        });

        if (response.status === 204 || response.data == null) {
            return {
                products: [],
                count: 0,
                has_more: false
            };
        }

        const parsed = RawResponseSchema.parse(response.data);
        const products = (parsed.data ?? []).map(normalizeProduct);
        const hasMore = parsed.info?.more_records === true;
        const page = parsed.info?.page ?? input.page ?? 1;
        const perPage = parsed.info?.per_page ?? input.per_page ?? 200;
        const nextPageReachable = input.page_token === undefined && (page + 1) * perPage <= PAGE_WINDOW_LIMIT;
        const nextPageToken = parsed.info?.next_page_token;

        return {
            products,
            count: products.length,
            has_more: hasMore,
            ...(hasMore && nextPageReachable && { next_page: page + 1 }),
            ...(hasMore && nextPageToken != null && { next_page_token: nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
