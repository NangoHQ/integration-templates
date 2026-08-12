import { z } from 'zod';
import { createAction } from 'nango';

const JournalLineInputSchema = z
    .object({
        accountCode: z.string().describe('Chart of accounts code for the line. Example: "200"'),
        accountId: z.string().optional().describe('Xero Account ID. Example: "00000000-0000-0000-0000-000000000000"'),
        description: z.string().optional().describe('Line item description.'),
        lineAmount: z.number().describe('Debit or credit amount. Positive for debit, negative for credit.'),
        taxType: z.string().optional().describe('Tax type code applied to the line. Example: "NONE"'),
        journalLineId: z.string().optional().describe('Existing journal line ID to update; omit to add a new line.')
    })
    .describe('A single debit or credit line within a manual journal update payload.');

const InputSchema = z
    .object({
        manualJournalId: z.string().describe('The Xero ManualJournalID to update. Example: "4226970f-be79-478c-855d-35011950e2db"'),
        status: z.enum(['DRAFT', 'POSTED', 'VOIDED', 'DELETED']).optional().describe('Journal status. Set to POSTED to commit a draft journal to the ledger.'),
        narration: z.string().optional().describe('Description or narrative for the journal.'),
        date: z.string().optional().describe('Journal date in YYYY-MM-DD format.'),
        url: z.string().optional().describe('URL link to source document or further details.'),
        showOnCashBasisReports: z.boolean().optional().describe('Whether to include in cash-basis reports.'),
        lineAmountTypes: z.enum(['Inclusive', 'Exclusive', 'NoTax']).optional().describe('Line amount tax treatment.'),
        journalLines: z
            .array(JournalLineInputSchema)
            .optional()
            .describe('Complete set of journal lines to replace existing lines. Only allowed on DRAFT journals.')
    })
    .describe('Input fields for updating an existing Xero manual journal.');

const JournalLineOutputSchema = z
    .object({
        journalLineId: z.string().optional().describe('Unique identifier for the journal line.'),
        accountId: z.string().optional().describe('Xero Account ID.'),
        accountCode: z.string().optional().describe('Chart of accounts code.'),
        accountName: z.string().optional().describe('Display name of the account.'),
        description: z.string().optional().describe('Line item description.'),
        lineAmount: z.number().describe('Debit or credit amount. Positive for debit, negative for credit.'),
        taxType: z.string().optional().describe('Tax type code applied to the line.'),
        taxName: z.string().optional().describe('Display name of the tax type.')
    })
    .describe('A single debit or credit line within a returned manual journal.');

const OutputSchema = z
    .object({
        manualJournalId: z.string().describe('Unique identifier for the manual journal.'),
        status: z.enum(['DRAFT', 'POSTED', 'VOIDED', 'DELETED']).describe('Current journal status.'),
        narration: z.string().optional().describe('Description or narrative for the journal.'),
        date: z.string().optional().describe('Journal date in YYYY-MM-DD format.'),
        url: z.string().optional().describe('URL link to source document or further details.'),
        showOnCashBasisReports: z.boolean().optional().describe('Whether the journal appears in cash-basis reports.'),
        lineAmountTypes: z.enum(['Inclusive', 'Exclusive', 'NoTax']).optional().describe('Line amount tax treatment.'),
        journalLines: z.array(JournalLineOutputSchema).optional().describe('Individual debit and credit lines.'),
        updatedDateUTC: z.string().optional().describe('Last modified timestamp in Xero .NET JSON date format.'),
        hasAttachments: z.boolean().optional().describe('Whether the journal has file attachments.')
    })
    .describe('Output fields for a returned Xero manual journal after an update.');

const ProviderJournalLineSchema = z.object({
    JournalLineID: z.string().optional(),
    AccountID: z.string().optional(),
    AccountCode: z.string().optional(),
    AccountName: z.string().optional(),
    Description: z.string().optional(),
    LineAmount: z.number(),
    TaxType: z.string().optional(),
    TaxName: z.string().optional()
});

const ProviderManualJournalSchema = z.object({
    ManualJournalID: z.string(),
    Status: z.enum(['DRAFT', 'POSTED', 'VOIDED', 'DELETED']),
    Narration: z.string().optional(),
    Date: z.string().optional(),
    Url: z.string().optional(),
    ShowOnCashBasisReports: z.boolean().optional(),
    LineAmountTypes: z.enum(['Inclusive', 'Exclusive', 'NoTax']).optional(),
    JournalLines: z.array(ProviderJournalLineSchema).optional(),
    UpdatedDateUTC: z.string().optional(),
    HasAttachments: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    ManualJournals: z.array(ProviderManualJournalSchema)
});

async function resolveTenantId(nango: Parameters<(typeof action)['exec']>[0]): Promise<string> {
    const connection = await nango.getConnection();

    const connectionConfigSchema = z.object({
        tenant_id: z.string().optional()
    });
    const connectionConfig = connectionConfigSchema.parse(connection.connection_config || {});
    if (connectionConfig.tenant_id) {
        return connectionConfig.tenant_id;
    }

    const metadataSchema = z.object({
        tenantId: z.string().optional()
    });
    const metadata = metadataSchema.parse(connection.metadata || {});
    if (metadata.tenantId) {
        return metadata.tenantId;
    }

    const response = await nango.get({
        // https://developer.xero.com/documentation/api/accounting/overview
        endpoint: 'connections',
        retries: 10
    });

    const connectionsArraySchema = z.array(z.unknown());
    const parsedConnectionsArray = connectionsArraySchema.safeParse(response.data);

    if (!parsedConnectionsArray.success || parsedConnectionsArray.data.length === 0) {
        throw new nango.ActionError({
            type: 'missing_tenant',
            message: 'No Xero tenants found for this connection.'
        });
    }

    if (parsedConnectionsArray.data.length > 1) {
        throw new nango.ActionError({
            type: 'multiple_tenants',
            message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
        });
    }

    const firstConnectionSchema = z.object({
        tenantId: z.string().optional()
    });
    const firstConnection = firstConnectionSchema.safeParse(parsedConnectionsArray.data[0]);
    if (firstConnection.success && firstConnection.data.tenantId && firstConnection.data.tenantId.length > 0) {
        return firstConnection.data.tenantId;
    }

    throw new nango.ActionError({
        type: 'missing_tenant',
        message: 'Unable to resolve xero-tenant-id.'
    });
}

/**
 * @tags: [write]
 * @tagReason: Mutates an existing manual journal on the provider, including posting it to the ledger.
 * @pitfalls: Only DRAFT journals support journal line changes; POSTED journals reject line edits. Setting Status to DELETED soft-deletes the journal and it remains retrievable.
 */
const action = createAction({
    description: 'Update an existing manual journal, or post a DRAFT one to the ledger.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.manualjournals'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tenantId = await resolveTenantId(nango);

        const body: Record<string, unknown> = {
            ManualJournalID: input.manualJournalId
        };

        if (input.status !== undefined) {
            body['Status'] = input.status;
        }
        if (input.narration !== undefined) {
            body['Narration'] = input.narration;
        }
        if (input.date !== undefined) {
            body['Date'] = input.date;
        }
        if (input.url !== undefined) {
            body['Url'] = input.url;
        }
        if (input.showOnCashBasisReports !== undefined) {
            body['ShowOnCashBasisReports'] = input.showOnCashBasisReports;
        }
        if (input.lineAmountTypes !== undefined) {
            body['LineAmountTypes'] = input.lineAmountTypes;
        }
        if (input.journalLines !== undefined) {
            body['JournalLines'] = input.journalLines.map((line) => ({
                ...(line.journalLineId !== undefined && { JournalLineID: line.journalLineId }),
                AccountCode: line.accountCode,
                ...(line.accountId !== undefined && { AccountID: line.accountId }),
                ...(line.description !== undefined && { Description: line.description }),
                LineAmount: line.lineAmount,
                ...(line.taxType !== undefined && { TaxType: line.taxType })
            }));
        }

        const response = await nango.post({
            // https://developer.xero.com/documentation/api/accounting/manualjournals
            endpoint: `api.xro/2.0/ManualJournals/${encodeURIComponent(input.manualJournalId)}`,
            data: body,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const journal = providerResponse.ManualJournals[0];

        if (!journal) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Xero returned an empty ManualJournals array after update.'
            });
        }

        return {
            manualJournalId: journal.ManualJournalID,
            status: journal.Status,
            ...(journal.Narration !== undefined && { narration: journal.Narration }),
            ...(journal.Date !== undefined && { date: journal.Date }),
            ...(journal.Url !== undefined && { url: journal.Url }),
            ...(journal.ShowOnCashBasisReports !== undefined && { showOnCashBasisReports: journal.ShowOnCashBasisReports }),
            ...(journal.LineAmountTypes !== undefined && { lineAmountTypes: journal.LineAmountTypes }),
            ...(journal.JournalLines !== undefined && {
                journalLines: journal.JournalLines.map((line) => ({
                    ...(line.JournalLineID !== undefined && { journalLineId: line.JournalLineID }),
                    ...(line.AccountID !== undefined && { accountId: line.AccountID }),
                    ...(line.AccountCode !== undefined && { accountCode: line.AccountCode }),
                    ...(line.AccountName !== undefined && { accountName: line.AccountName }),
                    ...(line.Description !== undefined && { description: line.Description }),
                    lineAmount: line.LineAmount,
                    ...(line.TaxType !== undefined && { taxType: line.TaxType }),
                    ...(line.TaxName !== undefined && { taxName: line.TaxName })
                }))
            }),
            ...(journal.UpdatedDateUTC !== undefined && { updatedDateUTC: journal.UpdatedDateUTC }),
            ...(journal.HasAttachments !== undefined && { hasAttachments: journal.HasAttachments })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
