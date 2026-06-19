import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().optional().describe('Coupon ID to filter by. Example: "cbdemo_earlybird"'),
    name: z.string().optional().describe('Coupon name to filter by.'),
    discount_type: z.string().optional().describe('Discount type to filter by. Example: "fixed_amount" or "percentage"'),
    status: z.string().optional().describe('Coupon status to filter by. Example: "active" or "expired"'),
    apply_on: z.string().optional().describe('Apply on to filter by. Example: "plan_amount" or "invoice_amount"'),
    'updated_at[gt]': z.string().optional().describe('Filter coupons updated after this Unix timestamp (seconds).'),
    'updated_at[lt]': z.string().optional().describe('Filter coupons updated before this Unix timestamp (seconds).'),
    'updated_at[gte]': z.string().optional().describe('Filter coupons updated on or after this Unix timestamp (seconds).'),
    'updated_at[lte]': z.string().optional().describe('Filter coupons updated on or before this Unix timestamp (seconds).'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of records to return. Max 100.'),
    offset: z.string().optional().describe('Pagination offset cursor from the previous response.')
});

const ProviderCouponSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    discount_type: z.string().optional(),
    discount_amount: z.number().int().optional(),
    discount_percentage: z.number().optional(),
    status: z.string().optional(),
    apply_on: z.string().optional(),
    created_at: z.number().int().optional(),
    updated_at: z.number().int().optional(),
    resource_version: z.number().int().optional(),
    deleted: z.boolean().optional(),
    object: z.string().optional()
});

const ProviderListSchema = z.object({
    list: z.array(ProviderCouponSchema).optional(),
    next_offset: z.string().optional()
});

const CouponSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    discount_type: z.string().optional(),
    discount_amount: z.number().int().optional(),
    discount_percentage: z.number().optional(),
    status: z.string().optional(),
    apply_on: z.string().optional(),
    created_at: z.number().int().optional(),
    updated_at: z.number().int().optional(),
    resource_version: z.number().int().optional(),
    deleted: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(CouponSchema),
    next_offset: z.string().optional()
});

const action = createAction({
    description: 'List coupons (Product Catalog 1.0 accounts only).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://apidocs.chargebee.com/docs/api/coupons
            endpoint: '/api/v2/coupons',
            params: {
                ...(input.id !== undefined && { id: input.id }),
                ...(input.name !== undefined && { name: input.name }),
                ...(input.discount_type !== undefined && { discount_type: input.discount_type }),
                ...(input.status !== undefined && { status: input.status }),
                ...(input.apply_on !== undefined && { apply_on: input.apply_on }),
                ...(input['updated_at[gt]'] !== undefined && { 'updated_at[after]': input['updated_at[gt]'] }),
                ...(input['updated_at[lt]'] !== undefined && { 'updated_at[lt]': input['updated_at[lt]'] }),
                ...(input['updated_at[gte]'] !== undefined && { 'updated_at[gte]': input['updated_at[gte]'] }),
                ...(input['updated_at[lte]'] !== undefined && { 'updated_at[lte]': input['updated_at[lte]'] }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.offset !== undefined && { offset: input.offset })
            },
            retries: 3
        });

        const providerData = ProviderListSchema.parse(response.data);

        return {
            items: (providerData.list || []).map((coupon) => ({
                id: coupon.id,
                ...(coupon.name !== undefined && { name: coupon.name }),
                ...(coupon.discount_type !== undefined && { discount_type: coupon.discount_type }),
                ...(coupon.discount_amount !== undefined && { discount_amount: coupon.discount_amount }),
                ...(coupon.discount_percentage !== undefined && { discount_percentage: coupon.discount_percentage }),
                ...(coupon.status !== undefined && { status: coupon.status }),
                ...(coupon.apply_on !== undefined && { apply_on: coupon.apply_on }),
                ...(coupon.created_at !== undefined && { created_at: coupon.created_at }),
                ...(coupon.updated_at !== undefined && { updated_at: coupon.updated_at }),
                ...(coupon.resource_version !== undefined && { resource_version: coupon.resource_version }),
                ...(coupon.deleted !== undefined && { deleted: coupon.deleted })
            })),
            ...(providerData.next_offset !== undefined && { next_offset: providerData.next_offset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
