import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor ($skip value) from the previous response. Omit for the first page.'),
    top: z.number().optional().describe('Maximum number of records to return per page. Defaults to 100.')
});

const TaxGroupSchema = z
    .object({
        TaxGroupCode: z.string(),
        Description: z.string().optional().nullable(),
        dataAreaId: z.string().optional().nullable()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(TaxGroupSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List sales tax groups.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const top = input.top ?? 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/TaxGroups',
            params: {
                $top: String(top),
                $skip: String(skip)
            },
            retries: 3
        };

        const response = await nango.get(config);

        const responseSchema = z.object({
            value: z.array(z.unknown())
        });

        const parsed = responseSchema.parse(response.data);
        const items = parsed.value.map((item) => TaxGroupSchema.parse(item));

        const nextSkip = skip + items.length;
        const next_cursor = items.length === top ? String(nextSkip) : undefined;

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
