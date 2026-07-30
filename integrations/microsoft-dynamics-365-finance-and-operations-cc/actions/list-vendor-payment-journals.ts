import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(10000).optional().describe('Maximum number of records to return per page. Defaults to 100.')
});

const ProviderJournalSchema = z
    .object({
        dataAreaId: z.string().optional(),
        JournalBatchNumber: z.string().optional(),
        JournalName: z.string().optional(),
        Description: z.string().nullable().optional(),
        IsPosted: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderJournalSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List vendor (AP) payment journal headers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/VendorPaymentJournalHeaders',
            params: {
                $top: String(limit),
                $skip: String(skip),
                'cross-company': 'true'
            },
            retries: 3
        };

        const response = await nango.get(config);

        const data = z
            .object({
                value: z.array(z.unknown())
            })
            .parse(response.data);

        const items = data.value.map((item) => ProviderJournalSchema.parse(item));

        const nextCursor = items.length === limit ? String(skip + limit) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
