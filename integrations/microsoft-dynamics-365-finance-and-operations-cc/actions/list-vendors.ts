import { z } from 'zod';
import { createAction } from 'nango';

const PAGE_SIZE = 100;

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderVendorSchema = z.object({}).passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderVendorSchema),
    next_cursor: z.string().optional()
});

const ODataListResponseSchema = z.object({
    value: z.array(z.unknown()),
    '@odata.nextLink': z.string().optional()
});

const action = createAction({
    description: 'List vendors.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (Number.isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a numeric skip value'
            });
        }

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint: '/data/VendorsV2',
            params: {
                $top: String(PAGE_SIZE),
                $skip: String(skip),
                'cross-company': 'true'
            },
            retries: 3
        });

        const raw = ODataListResponseSchema.parse(response.data);

        const items = raw.value.map((item: unknown) => {
            if (typeof item !== 'object' || item === null) {
                throw new nango.ActionError({
                    type: 'unexpected_response',
                    message: 'Expected each vendor to be an object'
                });
            }
            return ProviderVendorSchema.parse(item);
        });

        let nextCursor: string | undefined;
        if (typeof raw['@odata.nextLink'] === 'string') {
            const url = new URL(raw['@odata.nextLink']);
            const skipParam = url.searchParams.get('$skip');
            if (skipParam) {
                nextCursor = skipParam;
            }
        } else if (items.length === PAGE_SIZE) {
            nextCursor = String(skip + PAGE_SIZE);
        }

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
