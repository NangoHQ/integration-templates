import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const LedgerJournalHeaderSchema = z.object({}).passthrough();

const OutputSchema = z.object({
    items: z.array(LedgerJournalHeaderSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List general ledger journal headers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const pageSize = 100;
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a numeric skip value.'
            });
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/LedgerJournalHeaders',
            params: {
                $top: String(pageSize),
                $skip: String(skip)
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                value: z.array(z.unknown())
            })
            .parse(response.data);

        const items = providerResponse.value.map((item) => {
            return LedgerJournalHeaderSchema.parse(item);
        });

        const nextCursor = items.length === pageSize ? String(skip + pageSize) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
