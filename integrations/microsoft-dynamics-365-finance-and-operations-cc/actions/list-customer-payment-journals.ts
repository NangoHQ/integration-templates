import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(10000).optional().describe('Maximum number of items to return per page. Defaults to 100.'),
    dataAreaId: z.string().optional().describe('Company / data area ID. Defaults to "dat".')
});

const ProviderJournalSchema = z
    .object({
        JournalBatchNumber: z.string().optional(),
        Name: z.string().optional(),
        Description: z.string().optional(),
        JournalType: z.string().optional(),
        IsPosted: z.string().optional(),
        dataAreaId: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(ProviderJournalSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List customer (AR) payment journal headers.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (input.cursor && (isNaN(skip) || skip < 0)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a non-negative integer string.'
            });
        }
        const dataAreaId = input.dataAreaId ?? 'dat';

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint: '/data/CustomerPaymentJournalHeaders',
            params: {
                $top: String(limit),
                $skip: String(skip),
                $filter: `dataAreaId eq '${dataAreaId.replace(/'/g, "''")}'`,
                'cross-company': 'true'
            },
            retries: 3
        });

        const ODataResponseSchema = z.object({
            value: z.array(z.unknown())
        });

        const parsedResponse = ODataResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from CustomerPaymentJournalHeaders endpoint.'
            });
        }

        const items = parsedResponse.data.value.map((item) => {
            const parsed = ProviderJournalSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Failed to parse a journal header item.',
                    details: parsed.error.message
                });
            }
            return parsed.data;
        });

        const nextCursor = items.length === limit ? String(skip + limit) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
