import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const OutputSchema = z.object({
    portalId: z.number(),
    accountType: z.string().optional(),
    timezone: z.string().optional(),
    companyCurrency: z.string().optional(),
    additionalCurrencies: z.array(z.string()),
    dataHostingLocation: z.string().optional(),
    uiDomain: z.string().optional(),
    utcOffset: z.string().optional(),
    utcOffsetMilliseconds: z.number().optional()
});

const action = createAction({
    description: 'Retrieve portal account details, currency settings, timezone, and hosting region',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/fetch-account-information',
        group: 'Account'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['settings.account.read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api-reference/account-account-info-v3/details/get-account-info-v3-details
        const response = await nango.get({
            endpoint: '/account-info/v3/details',
            retries: 3
        });

        const data = response.data;

        return {
            portalId: data.portalId,
            accountType: data.accountType ?? undefined,
            timezone: data.timeZone ?? undefined,
            companyCurrency: data.companyCurrency ?? undefined,
            additionalCurrencies: data.additionalCurrencies ?? [],
            dataHostingLocation: data.dataHostingLocation ?? undefined,
            uiDomain: data.uiDomain ?? undefined,
            utcOffset: data.utcOffset ?? undefined,
            utcOffsetMilliseconds: data.utcOffsetMilliseconds ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
