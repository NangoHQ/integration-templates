import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderCurrencySchema = z
    .object({
        CurrencyCode: z.string(),
        Name: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(
        z.object({
            currencyCode: z.string(),
            name: z.string().optional()
        })
    ),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List currencies configured for the tenant.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (Number.isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a valid integer representing the skip offset.'
            });
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/Currencies',
            params: {
                $top: '100',
                $skip: String(skip)
            },
            retries: 3
        });

        const raw = z
            .object({
                value: z.array(z.unknown())
            })
            .parse(response.data);

        const items = raw.value.map((item: unknown) => {
            const currency = ProviderCurrencySchema.parse(item);
            return {
                currencyCode: currency.CurrencyCode,
                ...(currency.Name != null && { name: currency.Name })
            };
        });

        const nextCursor = items.length === 100 ? String(skip + 100) : undefined;

        return {
            items,
            ...(nextCursor != null && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
