import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const OutputSchema = z.object({
    portal_id: z.number(),
    account_type: z.union([z.string(), z.null()]),
    timezone: z.union([z.string(), z.null()]),
    company_currency: z.union([z.string(), z.null()]),
    additional_currencies: z.array(z.string()),
    data_hosting_location: z.union([z.string(), z.null()]),
    ui_domain: z.union([z.string(), z.null()]),
    utc_offset: z.union([z.string(), z.null()]),
    utc_offset_milliseconds: z.union([z.number(), z.null()])
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
            portal_id: data.portalId,
            account_type: data.accountType ?? null,
            timezone: data.timeZone ?? null,
            company_currency: data.companyCurrency ?? null,
            additional_currencies: data.additionalCurrencies ?? [],
            data_hosting_location: data.dataHostingLocation ?? null,
            ui_domain: data.uiDomain ?? null,
            utc_offset: data.utcOffset ?? null,
            utc_offset_milliseconds: data.utcOffsetMilliseconds ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
