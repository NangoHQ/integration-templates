import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    targeting_type: z.enum(['APPTYPE', 'GENDER', 'LOCALE', 'AGE_BUCKET', 'LOCATION', 'GEO', 'INTEREST', 'KEYWORD', 'AUDIENCE_INCLUDE', 'AUDIENCE_EXCLUDE']),
    ad_account_id: z.string().describe('Unique identifier of an ad account. Example: "549770573673"')
});

const ProviderTargetingOptionSchema = z.record(z.string(), z.unknown());

const OutputSchema = z.object({
    items: z.array(ProviderTargetingOptionSchema)
});

const action = createAction({
    description: 'Look up valid targeting option values (e.g. interests, locations) by type.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/targeting_options/get
            endpoint: `/v5/resources/targeting/${encodeURIComponent(input.targeting_type)}`,
            params: {
                ad_account_id: input.ad_account_id
            },
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of targeting options from the provider.'
            });
        }

        const items = response.data.map((item: unknown) => {
            const parsed = ProviderTargetingOptionSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Targeting option item did not match expected shape.',
                    detail: parsed.error.message
                });
            }
            return parsed.data;
        });

        return { items };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
