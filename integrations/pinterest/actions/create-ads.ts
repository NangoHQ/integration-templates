import { z } from 'zod';
import { createAction } from 'nango';

const AdCreateSchema = z
    .object({
        ad_group_id: z.string().describe('Ad group ID. Example: "2680091388706"'),
        pin_id: z.string().describe('Pin ID. Example: "1099300590356451849"'),
        creative_type: z.string().optional().describe('Creative type. Example: "REGULAR"'),
        name: z.string().optional().describe('Ad name. Example: "My Ad"'),
        status: z.string().optional().describe('Ad status. Example: "ACTIVE"'),
        android_deep_link: z.string().optional(),
        click_tracking_url: z.string().optional(),
        destination_url: z.string().optional(),
        view_tracking_url: z.string().optional()
    })
    .passthrough();

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    ads: z.array(AdCreateSchema).describe('Array of ad objects to create.')
});

const ExceptionSchema = z
    .object({
        code: z.number().optional(),
        message: z.string().optional()
    })
    .passthrough();

const AdDataSchema = z.object({}).passthrough();

const ExceptionsSchema = z.union([ExceptionSchema, z.array(ExceptionSchema)]);

const ItemSchema = z.object({
    data: AdDataSchema.optional(),
    exceptions: ExceptionsSchema.optional()
});

const OutputSchema = z.object({
    items: z.array(ItemSchema)
});

const action = createAction({
    description: 'Create one or more ads.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.pinterest.com/docs/api/v5/#operation/ads/create
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/ads`,
            data: input.ads,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
