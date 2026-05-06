import { createSync } from 'nango';
import { z } from 'zod';

const OpportunitySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    amount: z.number().optional(),
    stage: z.string().optional(),
    close_date: z.string().optional(),
    owner_id: z.string().optional(),
    updated_at: z.string()
});

const CheckpointInputSchema = z.object({
    updated_after: z.string().optional()
});

const CheckpointOutputSchema = z.object({
    updated_after: z.string()
});

const SalesforceOpportunitySchema = z.object({
    Id: z.string(),
    Name: z.string().nullable().optional(),
    Amount: z.number().nullable().optional(),
    StageName: z.string().nullable().optional(),
    CloseDate: z.string().nullable().optional(),
    OwnerId: z.string().nullable().optional(),
    SystemModstamp: z.string()
});

const SalesforceQueryResponseSchema = z.object({
    records: z.array(SalesforceOpportunitySchema),
    done: z.boolean(),
    nextRecordsUrl: z.string().optional()
});

type SalesforceOpportunity = z.infer<typeof SalesforceOpportunitySchema>;

const sync = createSync({
    description: 'Sync Salesforce Opportunity records with amount, stage, close date, and owner fields.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            path: '/syncs/opportunities',
            method: 'POST'
        }
    ],
    models: {
        Opportunity: OpportunitySchema
    },
    checkpoint: CheckpointOutputSchema,

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const checkpointParse = CheckpointInputSchema.safeParse(checkpoint);
        const updatedAfter = checkpointParse.success ? checkpointParse.data.updated_after : undefined;

        // Build SOQL query with incremental filter
        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
        let soqlQuery = 'SELECT Id, Name, Amount, StageName, CloseDate, OwnerId, SystemModstamp FROM Opportunity';
        if (updatedAfter) {
            soqlQuery += ` WHERE SystemModstamp >= ${updatedAfter}`;
        }
        soqlQuery += ' ORDER BY SystemModstamp ASC';

        let nextRecordsUrl: string | undefined;

        while (true) {
            const response = nextRecordsUrl
                ? await nango.get({
                      endpoint: nextRecordsUrl,
                      retries: 3
                  })
                : await nango.get({
                      // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
                      endpoint: '/services/data/v59.0/query',
                      params: {
                          q: soqlQuery
                      },
                      retries: 3
                  });

            const parsed = SalesforceQueryResponseSchema.parse(response.data);
            const records = parsed.records;

            if (records.length === 0) {
                if (!parsed.nextRecordsUrl) {
                    break;
                }

                nextRecordsUrl = parsed.nextRecordsUrl;
                continue;
            }

            const opportunities = records.map((record: SalesforceOpportunity) => ({
                id: record.Id,
                ...(record.Name != null && { name: record.Name }),
                ...(record.Amount != null && { amount: record.Amount }),
                ...(record.StageName != null && { stage: record.StageName }),
                ...(record.CloseDate != null && { close_date: record.CloseDate }),
                ...(record.OwnerId != null && { owner_id: record.OwnerId }),
                updated_at: record.SystemModstamp
            }));

            await nango.batchSave(opportunities, 'Opportunity');

            const lastRecord = records[records.length - 1];
            if (lastRecord) {
                await nango.saveCheckpoint(CheckpointOutputSchema.parse({ updated_after: lastRecord.SystemModstamp }));
            }

            if (!parsed.nextRecordsUrl) {
                break;
            }

            nextRecordsUrl = parsed.nextRecordsUrl;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
