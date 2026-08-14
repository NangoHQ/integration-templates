import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        manualJournalId: z.string().describe('The Xero ManualJournalID of the manual journal to retrieve. Example: "4226970f-be79-478c-855d-35011950e2db"')
    })
    .describe('Input for retrieving a single Xero manual journal by its unique identifier.');

const JournalLineSchema = z.object({
    JournalLineID: z.string().optional(),
    AccountID: z.string().optional(),
    AccountCode: z.string().optional(),
    AccountName: z.string().optional(),
    Description: z.string().optional(),
    TaxType: z.string().optional(),
    TaxName: z.string().optional(),
    Tracking: z.array(z.record(z.string(), z.unknown())).optional(),
    LineAmount: z.number().optional(),
    IsCredit: z.boolean().optional(),
    IsDebit: z.boolean().optional()
});

const ManualJournalSchema = z.object({
    ManualJournalID: z.string(),
    Date: z.string().optional(),
    Status: z.string().optional(),
    LineAmountTypes: z.string().optional(),
    UpdatedDateUTC: z.string().optional(),
    Narration: z.string().optional(),
    JournalLines: z.array(JournalLineSchema).optional(),
    HasAttachments: z.boolean().optional(),
    Url: z.string().optional(),
    ShowOnCashBasisReports: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    ManualJournals: z.array(ManualJournalSchema)
});

const OutputSchema = z
    .object({
        manualJournalId: z.string().describe('The unique Xero identifier for the manual journal.'),
        date: z.string().optional().describe('The date of the manual journal.'),
        status: z.string().optional().describe('The status of the manual journal, e.g. POSTED or DRAFT.'),
        lineAmountTypes: z.string().optional().describe('The line amount types for the manual journal.'),
        updatedDateUTC: z.string().optional().describe('The UTC date and time when the manual journal was last updated.'),
        narration: z.string().optional().describe('The narration or description for the manual journal.'),
        journalLines: z
            .array(
                z.object({
                    journalLineId: z.string().optional().describe('The unique identifier for the journal line.'),
                    accountId: z.string().optional().describe('The Xero AccountID associated with this line.'),
                    accountCode: z.string().optional().describe('The account code associated with this line.'),
                    accountName: z.string().optional().describe('The display name of the account.'),
                    description: z.string().optional().describe('A description for the journal line.'),
                    taxType: z.string().optional().describe('The tax type applied to this line.'),
                    taxName: z.string().optional().describe('The display name of the tax type.'),
                    tracking: z.array(z.record(z.string(), z.unknown())).optional().describe('Tracking categories applied to this line.'),
                    amount: z.number().optional().describe('The monetary amount of the journal line.'),
                    isCredit: z.boolean().optional().describe('Whether this line is a credit.'),
                    isDebit: z.boolean().optional().describe('Whether this line is a debit.')
                })
            )
            .optional()
            .describe('The journal lines that make up the manual journal.'),
        hasAttachments: z.boolean().optional().describe('Whether the manual journal has file attachments.'),
        url: z.string().optional().describe('A URL link to the manual journal in Xero.'),
        showOnCashBasisReports: z.boolean().optional().describe('Whether the manual journal is shown on cash-basis reports.')
    })
    .describe('A Xero manual journal including its journal lines, status, and metadata.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single manual journal by ID from the Xero Accounting API.
 * @pitfalls: Dates are returned in `/Date(timestamp+offset)/` format rather than ISO 8601, and deleted or voided journals remain gettable with a `DELETED` or `VOIDED` status instead of a 404.
 */
const action = createAction({
    description: 'Retrieve a manual journal by ManualJournalID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.manualjournals'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;
        if (
            typeof connection.connection_config === 'object' &&
            connection.connection_config !== null &&
            'tenant_id' in connection.connection_config &&
            typeof connection.connection_config['tenant_id'] === 'string' &&
            connection.connection_config['tenant_id'].length > 0
        ) {
            tenantId = connection.connection_config['tenant_id'];
        }

        if (
            !tenantId &&
            typeof connection.metadata === 'object' &&
            connection.metadata !== null &&
            'tenantId' in connection.metadata &&
            typeof connection.metadata['tenantId'] === 'string' &&
            connection.metadata['tenantId'].length > 0
        ) {
            tenantId = connection.metadata['tenantId'];
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/guides/oauth2/tenants
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = connectionsResponse.data;
            if (!Array.isArray(connectionsData) || connectionsData.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connectionsData.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = connectionsData[0];
            if (
                firstConnection !== null &&
                typeof firstConnection === 'object' &&
                typeof firstConnection['tenantId'] === 'string' &&
                firstConnection['tenantId'].length > 0
            ) {
                tenantId = firstConnection['tenantId'];
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/manualjournals
        const response = await nango.get({
            endpoint: `api.xro/2.0/ManualJournals/${encodeURIComponent(input.manualJournalId)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The provider response could not be parsed.',
                details: parsed.error.message
            });
        }

        const manualJournals = parsed.data.ManualJournals;
        const [mj] = manualJournals;
        if (!mj) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Manual journal with ID "${input.manualJournalId}" was not found.`
            });
        }

        return {
            manualJournalId: mj.ManualJournalID,
            ...(mj.Date !== undefined && { date: mj.Date }),
            ...(mj.Status !== undefined && { status: mj.Status }),
            ...(mj.LineAmountTypes !== undefined && { lineAmountTypes: mj.LineAmountTypes }),
            ...(mj.UpdatedDateUTC !== undefined && { updatedDateUTC: mj.UpdatedDateUTC }),
            ...(mj.Narration !== undefined && { narration: mj.Narration }),
            ...(mj.JournalLines !== undefined && {
                journalLines: mj.JournalLines.map((line) => ({
                    ...(line.JournalLineID !== undefined && { journalLineId: line.JournalLineID }),
                    ...(line.AccountID !== undefined && { accountId: line.AccountID }),
                    ...(line.AccountCode !== undefined && { accountCode: line.AccountCode }),
                    ...(line.AccountName !== undefined && { accountName: line.AccountName }),
                    ...(line.Description !== undefined && { description: line.Description }),
                    ...(line.TaxType !== undefined && { taxType: line.TaxType }),
                    ...(line.TaxName !== undefined && { taxName: line.TaxName }),
                    ...(line.Tracking !== undefined && { tracking: line.Tracking }),
                    ...(line.LineAmount !== undefined && { amount: line.LineAmount }),
                    ...(line.IsCredit !== undefined && { isCredit: line.IsCredit }),
                    ...(line.IsDebit !== undefined && { isDebit: line.IsDebit })
                }))
            }),
            ...(mj.HasAttachments !== undefined && { hasAttachments: mj.HasAttachments }),
            ...(mj.Url !== undefined && { url: mj.Url }),
            ...(mj.ShowOnCashBasisReports !== undefined && { showOnCashBasisReports: mj.ShowOnCashBasisReports })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
