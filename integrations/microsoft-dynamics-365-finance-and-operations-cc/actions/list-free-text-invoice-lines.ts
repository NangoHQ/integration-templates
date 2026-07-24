import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().optional().describe('Company data area ID. Example: "dat"'),
    parentRecId: z.string().optional().describe('Parent header record ID (RecId). Example: "5637144576"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const FreeTextInvoiceLineSchema = z.object({}).passthrough();

const ODataResponseSchema = z.object({
    value: z.array(FreeTextInvoiceLineSchema),
    '@odata.nextLink': z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(FreeTextInvoiceLineSchema),
    nextCursor: z.string().optional()
});

const PAGE_SIZE = 100;

const action = createAction({
    description: 'List free text invoice lines, optionally scoped to a parent invoice.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const filters: string[] = [];
        if (input.dataAreaId) {
            filters.push(`dataAreaId eq '${input.dataAreaId.replace(/'/g, "''")}'`);
        }
        if (input.parentRecId) {
            // ParentRecId is a raw numeric OData literal (no surrounding quotes), so it must be
            // restricted to digits only. Otherwise a crafted string could alter/break out of the
            // filter instead of scoping to a single parent record.
            if (!/^\d+$/.test(input.parentRecId)) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'parentRecId must contain only decimal digits.',
                    parentRecId: input.parentRecId
                });
            }
            filters.push(`ParentRecId eq ${input.parentRecId}`);
        }

        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (Number.isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a valid skip offset.'
            });
        }

        const params: Record<string, string | number> = {
            $top: PAGE_SIZE,
            $skip: skip
        };
        if (filters.length > 0) {
            params['$filter'] = filters.join(' and ');
        }
        // A dataAreaId filter is scoped to the caller's default legal entity unless cross-company
        // is enabled, so requesting a specific (potentially non-default) company must also enable it.
        if (input.dataAreaId) {
            params['cross-company'] = 'true';
        }

        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const response = await nango.get({
            endpoint: '/data/FreeTextInvoiceLines',
            params,
            retries: 3
        });

        const data = ODataResponseSchema.parse(response.data);
        const items = data.value;

        let nextCursor: string | undefined;
        if (data['@odata.nextLink'] != null) {
            // Server explicitly says there's more — trust it, and try to extract the real $skip it wants us to use next.
            const nextUrl = new URL(data['@odata.nextLink']);
            const skipParam = nextUrl.searchParams.get('$skip');
            nextCursor = skipParam ?? String(skip + items.length);
        } else if (items.length === PAGE_SIZE) {
            // No explicit nextLink, but we got a full page — assume there may be more.
            nextCursor = String(skip + PAGE_SIZE);
        }

        return {
            items,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
