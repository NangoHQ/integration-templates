import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dataAreaId: z.string().describe("Company code / data area ID. Example: 'dat'"),
    journalBatchNumber: z.string().describe("Journal batch number. Example: 'DAT-000015'")
});

const ProviderLedgerJournalHeaderSchema = z
    .object({
        dataAreaId: z.string(),
        JournalBatchNumber: z.string(),
        JournalName: z.string().optional(),
        Description: z.string().nullable().optional(),
        IsPosted: z.string().optional(),
        PostedDateTime: z.string().nullable().optional(),
        CreatedDateTime: z.string().nullable().optional(),
        CreatedBy: z.string().nullable().optional(),
        LedgerJournalId: z.string().nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    dataAreaId: z.string(),
    journalBatchNumber: z.string(),
    journalName: z.string().optional(),
    description: z.string().optional(),
    isPosted: z.string().optional(),
    postedDateTime: z.string().optional(),
    createdDateTime: z.string().optional(),
    createdBy: z.string().optional(),
    ledgerJournalId: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a general ledger journal header',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['FinancialsRead'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const url = `/data/LedgerJournalHeaders(dataAreaId='${encodeURIComponent(input.dataAreaId).replace(/'/g, "''")}',JournalBatchNumber='${encodeURIComponent(input.journalBatchNumber).replace(/'/g, "''")}')`;

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: url,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Ledger journal header not found',
                dataAreaId: input.dataAreaId,
                journalBatchNumber: input.journalBatchNumber
            });
        }

        const providerHeader = ProviderLedgerJournalHeaderSchema.parse(response.data);

        return {
            dataAreaId: providerHeader.dataAreaId,
            journalBatchNumber: providerHeader.JournalBatchNumber,
            ...(providerHeader.JournalName !== undefined && { journalName: providerHeader.JournalName }),
            ...(providerHeader.Description != null && { description: providerHeader.Description }),
            ...(providerHeader.IsPosted !== undefined && { isPosted: providerHeader.IsPosted }),
            ...(providerHeader.PostedDateTime != null && { postedDateTime: providerHeader.PostedDateTime }),
            ...(providerHeader.CreatedDateTime != null && { createdDateTime: providerHeader.CreatedDateTime }),
            ...(providerHeader.CreatedBy != null && { createdBy: providerHeader.CreatedBy }),
            ...(providerHeader.LedgerJournalId != null && { ledgerJournalId: providerHeader.LedgerJournalId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
