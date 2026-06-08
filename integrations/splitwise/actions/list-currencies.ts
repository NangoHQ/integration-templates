import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderCurrencySchema = z.object({
    currency_code: z.string(),
    unit: z.string().nullable().optional()
});

const OutputSchema = z.object({
    currencies: z.array(
        z.object({
            currency_code: z.string(),
            unit: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'List currencies supported by Splitwise.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-currencies',
        group: 'Other'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://dev.splitwise.com/
            endpoint: '/api/v3.0/get_currencies',
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No currencies found'
            });
        }

        const providerData = z
            .object({
                currencies: z.array(ProviderCurrencySchema)
            })
            .parse(response.data);

        return {
            currencies: providerData.currencies.map((currency) => ({
                currency_code: currency.currency_code,
                ...(currency.unit != null && { unit: currency.unit })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
