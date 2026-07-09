import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    ad_account_id: z.string().describe('The ID of the ad account. Example: "549770573673"')
});

const ProviderEventSchema = z.object({
    name: z.string(),
    mapped_conversion_type: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            name: z.string(),
            mapped_conversion_type: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'List custom advertiser-defined conversion event definitions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/advertiser_defined_events/get
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/advertiser_defined_events`,
            retries: 3
        });

        const parsed = z
            .object({
                items: z.array(ProviderEventSchema)
            })
            .parse(response.data);

        return {
            items: parsed.items.map((item) => ({
                name: item.name,
                ...(item.mapped_conversion_type !== undefined && { mapped_conversion_type: item.mapped_conversion_type })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
