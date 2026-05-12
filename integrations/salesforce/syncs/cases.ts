import { createSync } from 'nango';
import { z } from 'zod';

// Salesforce Case record from SOQL query response
// https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
const SalesforceCaseSchema = z.object({
    Id: z.string(),
    CaseNumber: z.string().optional(),
    Subject: z.string().nullable().optional(),
    Description: z.string().nullable().optional(),
    Status: z.string().optional(),
    Priority: z.string().optional(),
    Origin: z.string().nullable().optional(),
    Reason: z.string().nullable().optional(),
    Type: z.string().nullable().optional(),
    OwnerId: z.string().optional(),
    AccountId: z.string().nullable().optional(),
    ContactId: z.string().nullable().optional(),
    CreatedDate: z.string(),
    LastModifiedDate: z.string(),
    SystemModstamp: z.string(),
    ClosedDate: z.string().nullable().optional(),
    IsClosed: z.boolean().optional(),
    IsEscalated: z.boolean().optional()
});

const CaseSchema = z.object({
    id: z.string(),
    case_number: z.string().optional(),
    subject: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    origin: z.string().optional(),
    reason: z.string().optional(),
    type: z.string().optional(),
    owner_id: z.string().optional(),
    account_id: z.string().optional(),
    contact_id: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    system_modstamp: z.string(),
    closed_at: z.string().optional(),
    is_closed: z.boolean().optional(),
    is_escalated: z.boolean().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync Salesforce Case records with common service and status fields.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/cases'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        Case: CaseSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const validated = CheckpointSchema.safeParse(checkpoint);
        const updatedAfter = validated.success ? validated.data.updated_after : undefined;

        // Build SOQL query with incremental filter
        // https://developer.salesforce.com/docs/atlas.en-us.soql_sosl.meta/soql_sosl/sforce_api_calls_soql_select_system_fields.htm
        const fields = [
            'Id',
            'CaseNumber',
            'Subject',
            'Description',
            'Status',
            'Priority',
            'Origin',
            'Reason',
            'Type',
            'OwnerId',
            'AccountId',
            'ContactId',
            'CreatedDate',
            'LastModifiedDate',
            'SystemModstamp',
            'ClosedDate',
            'IsClosed',
            'IsEscalated'
        ].join(', ');

        let whereClause = '';
        if (updatedAfter) {
            // Use an inclusive high-water mark so resumed runs do not skip rows that share the last processed timestamp.
            whereClause = ` WHERE SystemModstamp >= ${updatedAfter}`;
        }

        const soqlQuery = `SELECT ${fields} FROM Case${whereClause} ORDER BY SystemModstamp ASC`;

        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
        const proxyConfig: {
            endpoint: string;
            params: { q: string };
            paginate: {
                type: 'link';
                link_path_in_response_body: string;
                limit: number;
                limit_name_in_request: string;
                response_path: string;
            };
            retries: number;
        } = {
            endpoint: '/services/data/v62.0/query',
            params: {
                q: soqlQuery
            },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'nextRecordsUrl',
                limit: 200,
                limit_name_in_request: 'limit',
                response_path: 'records'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const rawCases: Array<z.infer<typeof SalesforceCaseSchema>> = [];
            for (const item of page) {
                const parsed = SalesforceCaseSchema.safeParse(item);
                if (!parsed.success) {
                    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
                    throw new Error(`Failed to parse Case record: ${issues}`);
                }
                rawCases.push(parsed.data);
            }

            if (rawCases.length === 0) {
                continue;
            }

            const cases = rawCases.map((record) => ({
                id: record.Id,
                ...(record.CaseNumber && { case_number: record.CaseNumber }),
                ...(record.Subject && { subject: record.Subject }),
                ...(record.Description && { description: record.Description }),
                ...(record.Status && { status: record.Status }),
                ...(record.Priority && { priority: record.Priority }),
                ...(record.Origin && { origin: record.Origin }),
                ...(record.Reason && { reason: record.Reason }),
                ...(record.Type && { type: record.Type }),
                ...(record.OwnerId && { owner_id: record.OwnerId }),
                ...(record.AccountId && { account_id: record.AccountId }),
                ...(record.ContactId && { contact_id: record.ContactId }),
                created_at: record.CreatedDate,
                updated_at: record.LastModifiedDate,
                system_modstamp: record.SystemModstamp,
                ...(record.ClosedDate && { closed_at: record.ClosedDate }),
                ...(record.IsClosed !== undefined && { is_closed: record.IsClosed }),
                ...(record.IsEscalated !== undefined && { is_escalated: record.IsEscalated })
            }));

            await nango.batchSave(cases, 'Case');

            // Save checkpoint from the last record's SystemModstamp
            const lastCase = rawCases[rawCases.length - 1];
            if (lastCase) {
                await nango.saveCheckpoint({
                    updated_after: lastCase.SystemModstamp
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
