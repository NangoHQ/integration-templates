import { z } from 'zod';
import { createAction } from 'nango';

const JournalLineInputSchema = z.object({
    account_code: z.string().describe('Xero account code for this journal line. Example: "200"'),
    line_amount: z
        .number()
        .describe('Line amount in dollars. Positive values are debits, negative values are credits. The sum of all line amounts must equal zero.'),
    description: z.string().optional().describe('Optional description for this journal line.')
});

const InputSchema = z
    .object({
        narration: z.string().describe('Narration or description for the manual journal entry.'),
        date: z.string().describe('Transaction date in ISO 8601 format (YYYY-MM-DD). Example: "2024-01-15"'),
        journal_lines: z.array(JournalLineInputSchema).describe('Array of journal lines. Debits and credits must net to zero across all lines.'),
        status: z
            .enum(['DRAFT', 'POSTED'])
            .optional()
            .describe('Journal status. Defaults to DRAFT unless explicitly set to POSTED. Only POSTED journals are recorded in the general ledger.')
    })
    .describe('Input for creating a Xero manual journal entry.');

const ProviderJournalLineSchema = z.object({
    LineAmount: z.number(),
    AccountCode: z.string(),
    Description: z.string().optional()
});

const ProviderManualJournalSchema = z.object({
    ManualJournalID: z.string(),
    Narration: z.string(),
    Date: z.string(),
    Status: z.string(),
    JournalLines: z.array(ProviderJournalLineSchema),
    CreatedDateUTC: z.string().optional(),
    UpdatedDateUTC: z.string().optional()
});

const ProviderResponseSchema = z.object({
    ManualJournals: z.array(ProviderManualJournalSchema),
    Status: z.string().optional(),
    ProviderName: z.string().optional()
});

const JournalLineOutputSchema = z.object({
    line_amount: z.number().describe('Line amount in dollars. Positive values are debits, negative values are credits.'),
    account_code: z.string().describe('Xero account code for this journal line.'),
    description: z.string().optional().describe('Description for this journal line.')
});

const OutputSchema = z
    .object({
        manual_journal_id: z.string().describe('Unique Xero identifier for the created manual journal.'),
        narration: z.string().describe('Narration of the created manual journal.'),
        date: z.string().describe('Transaction date of the created manual journal.'),
        status: z.string().describe('Status of the created manual journal (DRAFT or POSTED).'),
        journal_lines: z.array(JournalLineOutputSchema).describe('Array of journal lines in the created manual journal.')
    })
    .describe('Output representing a created Xero manual journal entry.');

/**
 * @tags: [write]
 * @tagReason: Creates a new manual journal entry in Xero.
 * @pitfalls: Created journals default to Status "DRAFT" and do not post to the general ledger unless Status "POSTED" is explicitly sent; the returned date field is in Xero's "/Date(...)/" format rather than the ISO string passed in the input.
 */
const action = createAction({
    description: 'Create a manual journal entry.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.manualjournals'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = z.parse(
            z.object({
                connection_config: z.record(z.string(), z.unknown()).nullish(),
                metadata: z.record(z.string(), z.unknown()).nullish()
            }),
            await nango.getConnection()
        );

        const connectionConfig = z.parse(
            z.object({
                tenant_id: z.string().optional()
            }),
            connection.connection_config || {}
        );

        const metadata = z.parse(
            z.object({
                tenantId: z.string().optional()
            }),
            connection.metadata || {}
        );

        let tenantId = connectionConfig.tenant_id || metadata.tenantId;

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = z.parse(z.array(z.record(z.string(), z.unknown())), connectionsResponse.data || []);

            if (connectionsData.length === 0) {
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

            const firstConnection = z.parse(
                z.object({
                    tenantId: z.string()
                }),
                connectionsData[0]
            );

            tenantId = firstConnection.tenantId;
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        const lineSum = input.journal_lines.reduce((sum, line) => sum + line.line_amount, 0);
        if (Math.abs(lineSum) > 0.0001) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Journal line amounts must net to zero (debits and credits must balance).',
                current_sum: lineSum
            });
        }

        const payload = {
            ManualJournals: [
                {
                    Narration: input.narration,
                    Date: input.date,
                    Status: input.status || 'DRAFT',
                    JournalLines: input.journal_lines.map((line) => ({
                        AccountCode: line.account_code,
                        LineAmount: line.line_amount,
                        ...(line.description !== undefined && { Description: line.description })
                    }))
                }
            ]
        };

        // https://developer.xero.com/documentation/api/accounting/manualjournals
        const response = await nango.put({
            endpoint: 'api.xro/2.0/ManualJournals',
            headers: {
                'xero-tenant-id': tenantId
            },
            data: payload,
            retries: 3
        });

        const parsed = z.parse(ProviderResponseSchema, response.data);

        if (!parsed.ManualJournals || parsed.ManualJournals.length === 0) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Xero returned an empty ManualJournals array.'
            });
        }

        const journal = parsed.ManualJournals[0];

        if (!journal) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Xero returned an empty ManualJournals array.'
            });
        }

        return {
            manual_journal_id: journal.ManualJournalID,
            narration: journal.Narration,
            date: journal.Date,
            status: journal.Status,
            journal_lines: journal.JournalLines.map((line) => ({
                line_amount: line.LineAmount,
                account_code: line.AccountCode,
                ...(line.Description !== undefined && { description: line.Description })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
