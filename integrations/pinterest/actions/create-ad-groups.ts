import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const AdGroupCreateSchema = z
    .object({
        name: z.string(),
        campaign_id: z.string(),
        billable_event: z.string(),
        bid_in_micro_currency: z.number().optional(),
        budget_in_micro_currency: z.number().optional(),
        status: z.string().optional(),
        targeting_spec: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const InputSchema = z.object({
    ad_account_id: z.string().describe('Ad account ID. Example: "549770573673"'),
    ad_groups: z.array(AdGroupCreateSchema).min(1).max(30)
});

const BatchItemExceptionSchema = z
    .object({
        message: z.string(),
        error_code: z.number().optional()
    })
    .passthrough();

const ItemSchema = z
    .object({
        data: z.record(z.string(), z.unknown()).nullable().optional(),
        exceptions: z.array(BatchItemExceptionSchema).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ItemSchema)
});

const action = createAction({
    description: 'Create one or more ad groups.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        for (const adGroup of input.ad_groups) {
            const targeting = adGroup.targeting_spec;
            if (!targeting) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'Each ad group must include targeting_spec.'
                });
            }
            const hasGeo = 'GEO' in targeting && Array.isArray(targeting['GEO']) && targeting['GEO'].length > 0;
            const hasLocation = 'LOCATION' in targeting && Array.isArray(targeting['LOCATION']) && targeting['LOCATION'].length > 0;
            if (!hasGeo && !hasLocation) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'Each ad group targeting_spec must include at least one of GEO or LOCATION.'
                });
            }
        }

        const config: ProxyConfiguration = {
            // https://developers.pinterest.com/docs/api/v5/#operation/ad_groups/create
            endpoint: `/v5/ad_accounts/${encodeURIComponent(input.ad_account_id)}/ad_groups`,
            data: input.ad_groups,
            retries: 3
        };
        const response = await nango.post(config);

        const output = OutputSchema.parse(response.data);
        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
