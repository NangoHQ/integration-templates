import { z } from 'zod';
import { createAction } from 'nango';

const AdAccountCountrySchema = z.object({
    code: z.string(),
    currency: z.string(),
    index: z.number(),
    name: z.string()
});

const OutputSchema = z.object({
    items: z.array(AdAccountCountrySchema)
});

const action = createAction({
    description: 'List countries available for ad account creation/targeting.',
    version: '1.0.0',
    input: z.object({}),
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/ad_account_countries/get
            endpoint: '/v5/resources/ad_account_countries',
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
