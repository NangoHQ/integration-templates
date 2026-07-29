import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    top: z.number().int().min(1).max(10000).optional().describe('Maximum number of records to return per page. Defaults to 100.'),
    crossCompany: z.boolean().optional().describe('If true, query across all companies the caller can access.')
});

const ProviderItemSchema = z.object({}).passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderItemSchema),
    nextLink: z.string().optional()
});

const action = createAction({
    description: 'List sales quotation headers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const top = input.top ?? 100;
        let skip = 0;

        if (input.cursor !== undefined) {
            const parsed = Number(input.cursor);
            if (!Number.isInteger(parsed) || parsed < 0) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'cursor must be a non-negative integer string representing the $skip value.'
                });
            }
            skip = parsed;
        }

        const params: Record<string, string | number> = {
            $top: top,
            $skip: skip
        };

        if (input.crossCompany) {
            params['cross-company'] = 'true';
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/SalesQuotationHeadersV2',
            params,
            retries: 3
        });

        const data = z
            .object({
                value: z.array(z.unknown()).optional().default([])
            })
            .parse(response.data);

        const items = data.value.map((item) => ProviderItemSchema.parse(item));

        const nextLink = items.length === top ? String(skip + top) : undefined;

        return {
            items,
            ...(nextLink !== undefined && { nextLink })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
