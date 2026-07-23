import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    data_area_id: z.string().optional().describe('Company code (data area ID). Example: "dat"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of items to return per page. Defaults to 100.')
});

const ProviderJournalSchema = z
    .object({
        JournalBatchNumber: z.string(),
        JournalName: z.string().optional().nullable(),
        Description: z.string().optional().nullable(),
        IsPosted: z.string().optional().nullable(),
        DataAreaId: z.string().optional().nullable(),
        dataAreaId: z.string().optional().nullable()
    })
    .passthrough();

const ProviderListSchema = z.object({
    value: z.array(ProviderJournalSchema),
    '@odata.nextLink': z.string().optional()
});

const JournalSchema = z.object({
    id: z.string(),
    journal_batch_number: z.string(),
    journal_name: z.string().optional(),
    description: z.string().optional(),
    is_posted: z.string().optional(),
    data_area_id: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(JournalSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List customer (AR) payment journal headers.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;
        let skip = 0;
        if (input.cursor !== undefined) {
            const parsed = Number(input.cursor);
            if (!Number.isInteger(parsed) || parsed < 0) {
                throw new nango.ActionError({
                    type: 'invalid_cursor',
                    message: 'Cursor must be a non-negative integer string.'
                });
            }
            skip = parsed;
        }

        const params: Record<string, string | number> = {
            $top: limit,
            $skip: skip
        };

        if (input.data_area_id !== undefined) {
            params['$filter'] = `DataAreaId eq '${input.data_area_id.replace(/'/g, "''")}'`;
            // A company filter is scoped to the caller's default legal entity unless cross-company
            // is enabled, so requesting a specific (potentially non-default) company must also enable it.
            params['cross-company'] = 'true';
        }

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint: '/data/CustomerPaymentJournalHeaders',
            params,
            retries: 3
        });

        const providerList = ProviderListSchema.parse(response.data);

        const items = providerList.value.map((item) => {
            const dataAreaId = item.DataAreaId ?? item.dataAreaId;
            const idParts = [dataAreaId, item.JournalBatchNumber].filter((part): part is string => part !== undefined && part !== null);
            return {
                id: idParts.join('|'),
                journal_batch_number: item.JournalBatchNumber,
                ...(item.JournalName !== undefined && item.JournalName !== null && { journal_name: item.JournalName }),
                ...(item.Description !== undefined && item.Description !== null && { description: item.Description }),
                ...(item.IsPosted !== undefined && item.IsPosted !== null && { is_posted: item.IsPosted }),
                ...(dataAreaId !== undefined && dataAreaId !== null && { data_area_id: dataAreaId })
            };
        });

        let next_cursor: string | undefined;
        if (providerList['@odata.nextLink'] !== undefined) {
            // Server explicitly says there's more — trust it, and try to extract the real $skip it wants us to use next.
            const nextLink = providerList['@odata.nextLink'];
            const skipMatch = nextLink.match(/\$skip=(\d+)/);
            if (skipMatch !== null && skipMatch[1] !== undefined) {
                next_cursor = skipMatch[1];
            } else {
                next_cursor = String(skip + items.length);
            }
        } else if (items.length === limit) {
            // No explicit nextLink, but we got a full page — assume there may be more.
            next_cursor = String(skip + limit);
        }

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
