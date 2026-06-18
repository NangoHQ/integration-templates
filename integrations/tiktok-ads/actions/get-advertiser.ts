import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"')
});

const ProviderAdvertiserSchema = z.object({
    advertiser_id: z.string(),
    name: z.string().nullish(),
    status: z.string().nullish(),
    currency: z.string().nullish(),
    timezone: z.string().nullish(),
    country: z.string().nullish(),
    balance: z.union([z.string(), z.number()]).nullish(),
    create_time: z.union([z.string(), z.number()]).nullish(),
    display_timezone: z.string().nullish(),
    owner_bc_id: z.string().nullish(),
    company_name_editable: z.boolean().nullish(),
    telephone_number: z.string().nullish(),
    contacter: z.string().nullish(),
    cellphone_number: z.string().nullish(),
    role: z.string().nullish(),
    description: z.string().nullish(),
    rejection_reason: z.string().nullish(),
    address: z.string().nullish(),
    language: z.string().nullish(),
    industry: z.string().nullish(),
    license_no: z.string().nullish(),
    email: z.string().nullish(),
    license_url: z.string().nullish()
});

const OutputSchema = z.object({
    advertiser_id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    currency: z.string().optional(),
    timezone: z.string().optional(),
    country: z.string().optional(),
    balance: z.union([z.string(), z.number()]).optional(),
    create_time: z.union([z.string(), z.number()]).optional(),
    display_timezone: z.string().optional(),
    owner_bc_id: z.string().optional(),
    company_name_editable: z.boolean().optional(),
    telephone_number: z.string().optional(),
    contacter: z.string().optional(),
    cellphone_number: z.string().optional(),
    role: z.string().optional(),
    description: z.string().optional(),
    rejection_reason: z.string().optional(),
    address: z.string().optional(),
    language: z.string().optional(),
    industry: z.string().optional(),
    license_no: z.string().optional(),
    email: z.string().optional(),
    license_url: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single advertiser from TikTok Ads.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://business-api.tiktok.com/portal/docs?id=1739593083610113
        const config: Parameters<typeof nango.get>[0] = {
            endpoint: '/advertiser/info/',
            params: {
                advertiser_ids: JSON.stringify([input.advertiser_id])
            },
            retries: 3
        };

        if (nango.connectionId?.endsWith('-sandbox')) {
            config.baseUrlOverride = 'https://sandbox-ads.tiktok.com/open_api/v1.3/';
        }

        const response = await nango.get(config);

        const envelope = z
            .object({
                code: z.number(),
                message: z.string().optional(),
                request_id: z.string().optional(),
                data: z.unknown().optional()
            })
            .parse(response.data);

        if (envelope.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: envelope.message || `TikTok API returned error code ${envelope.code}`
            });
        }

        const listParse = z.object({ list: z.array(z.unknown()) }).safeParse(envelope.data);
        const advertisers = listParse.success ? listParse.data.list : [];

        const matching = advertisers.find((item: unknown) => {
            const itemParse = z.object({ advertiser_id: z.string() }).safeParse(item);
            return itemParse.success && itemParse.data.advertiser_id === input.advertiser_id;
        });

        if (!matching) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Advertiser not found: ${input.advertiser_id}`
            });
        }

        const advertiser = ProviderAdvertiserSchema.parse(matching);

        return {
            advertiser_id: advertiser.advertiser_id,
            ...(advertiser.name != null && { name: advertiser.name }),
            ...(advertiser.status != null && { status: advertiser.status }),
            ...(advertiser.currency != null && { currency: advertiser.currency }),
            ...(advertiser.timezone != null && { timezone: advertiser.timezone }),
            ...(advertiser.country != null && { country: advertiser.country }),
            ...(advertiser.balance != null && { balance: advertiser.balance }),
            ...(advertiser.create_time != null && { create_time: advertiser.create_time }),
            ...(advertiser.display_timezone != null && { display_timezone: advertiser.display_timezone }),
            ...(advertiser.owner_bc_id != null && { owner_bc_id: advertiser.owner_bc_id }),
            ...(advertiser.company_name_editable != null && { company_name_editable: advertiser.company_name_editable }),
            ...(advertiser.telephone_number != null && { telephone_number: advertiser.telephone_number }),
            ...(advertiser.contacter != null && { contacter: advertiser.contacter }),
            ...(advertiser.cellphone_number != null && { cellphone_number: advertiser.cellphone_number }),
            ...(advertiser.role != null && { role: advertiser.role }),
            ...(advertiser.description != null && { description: advertiser.description }),
            ...(advertiser.rejection_reason != null && { rejection_reason: advertiser.rejection_reason }),
            ...(advertiser.address != null && { address: advertiser.address }),
            ...(advertiser.language != null && { language: advertiser.language }),
            ...(advertiser.industry != null && { industry: advertiser.industry }),
            ...(advertiser.license_no != null && { license_no: advertiser.license_no }),
            ...(advertiser.email != null && { email: advertiser.email }),
            ...(advertiser.license_url != null && { license_url: advertiser.license_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
