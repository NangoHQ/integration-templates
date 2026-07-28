import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const CountrySchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    url: z.string().optional(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    isoAlpha2Code: z.string().optional(),
    isoAlpha3Code: z.string().optional(),
    isoNumericCode: z.string().optional()
});

const ProviderListResponseSchema = z.object({
    fullResultSize: z.number().optional(),
    from: z.number().optional(),
    count: z.number().optional(),
    versionDigest: z.string().optional(),
    values: z.array(CountrySchema).optional()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.number(),
            name: z.string().optional(),
            displayName: z.string().optional(),
            isoAlpha2Code: z.string().optional(),
            isoAlpha3Code: z.string().optional(),
            isoNumericCode: z.string().optional()
        })
    ),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List countries.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const from = input.cursor ? parseInt(input.cursor, 10) : 0;
        const count = 100;

        // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
        const response = await nango.get({
            endpoint: 'v2/country',
            params: {
                from: String(from),
                count: String(count)
            },
            retries: 3
        });

        const listResponse = ProviderListResponseSchema.parse(response.data);
        const items =
            listResponse.values?.map((country) => ({
                id: country.id,
                ...(country.name !== undefined && { name: country.name }),
                ...(country.displayName !== undefined && { displayName: country.displayName }),
                ...(country.isoAlpha2Code !== undefined && { isoAlpha2Code: country.isoAlpha2Code }),
                ...(country.isoAlpha3Code !== undefined && { isoAlpha3Code: country.isoAlpha3Code }),
                ...(country.isoNumericCode !== undefined && { isoNumericCode: country.isoNumericCode })
            })) ?? [];

        const nextFrom = from + (listResponse.count ?? count);
        const hasMore = nextFrom < (listResponse.fullResultSize ?? 0);

        return {
            items,
            ...(hasMore && { nextCursor: String(nextFrom) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
