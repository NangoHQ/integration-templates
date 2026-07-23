import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor ($skip value) from the previous response. Omit for the first page.'),
    top: z.number().int().positive().optional().describe('Maximum number of records to return per page. Defaults to 100.'),
    cross_company: z.boolean().optional().describe('If true, query across all companies instead of just the default company.')
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
        if (input.top !== undefined && (!Number.isInteger(input.top) || input.top <= 0)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'top must be a positive integer.'
            });
        }
        const top = input.top ?? 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        const params: Record<string, string> = {
            $top: String(top),
            $skip: String(skip)
        };
        if (input.cross_company) {
            params['cross-company'] = 'true';
        }

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/TaxGroups',
            params,
            retries: 3
        };

        const response = await nango.get(config);

        const responseSchema = z.object({
            value: z.array(z.unknown()),
            '@odata.nextLink': z.string().optional()
        });

        const parsed = responseSchema.parse(response.data);
        const items = parsed.value.map((item) => TaxGroupSchema.parse(item));

        let next_cursor: string | undefined;
        if (parsed['@odata.nextLink'] != null) {
            // Server explicitly says there's more — trust it, and try to extract the real $skip it wants us to use next.
            const nextUrl = new URL(parsed['@odata.nextLink']);
            const skipParam = nextUrl.searchParams.get('$skip');
            next_cursor = skipParam ?? String(skip + items.length);
        } else if (items.length === top) {
            // No explicit nextLink, but we got a full page — assume there may be more.
            next_cursor = String(skip + top);
        }

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
