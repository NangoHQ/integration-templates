import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderCustomerPaymentMethodSchema = z.object({}).passthrough();

const ListOutputSchema = z.object({
    items: z.array(ProviderCustomerPaymentMethodSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List customer payment methods.',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['DataAxService.Read'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const pageSize = 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (input.cursor && Number.isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a numeric skip value'
            });
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/CustomerPaymentMethods',
            params: {
                $top: String(pageSize),
                $skip: String(skip)
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                value: z.array(z.unknown()).optional(),
                '@odata.nextLink': z.string().optional()
            })
            .parse(response.data);

        const items = (providerResponse.value || []).map((item: unknown) => {
            return ProviderCustomerPaymentMethodSchema.parse(item);
        });

        let nextCursor: string | undefined;
        if (providerResponse['@odata.nextLink']) {
            const url = new URL(providerResponse['@odata.nextLink']);
            const nextSkip = url.searchParams.get('$skip');
            if (nextSkip) {
                nextCursor = nextSkip;
            } else {
                nextCursor = String(skip + pageSize);
            }
        } else if (items.length === pageSize) {
            nextCursor = String(skip + pageSize);
        }

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
