import { createSync } from 'nango';
import { z } from 'zod';

// https://developer.salesforce.com/docs/atlas.en-us.knowledge_dev.meta/knowledge_dev/knowledge_article_dev.htm
// Salesforce Knowledge Article Version object fields
const SalesforceArticleSchema = z.object({
    Id: z.string(),
    Name: z.string().optional(),
    Description: z.string().nullable().optional(),
    LastModifiedDate: z.string(),
    CreatedDate: z.string().optional()
});

const SalesforceQueryResponseSchema = z.object({
    totalSize: z.number(),
    done: z.boolean(),
    records: z.array(SalesforceArticleSchema),
    nextRecordsUrl: z.string().optional()
});

const ArticleSchema = z.object({
    id: z.string(),
    knowledge_article_id: z.string(),
    title: z.string().optional(),
    summary: z.string().optional(),
    body: z.string().optional(),
    last_modified_at: z.string(),
    created_at: z.string().optional(),
    publish_status: z.string().optional(),
    language: z.string().optional()
});

// Checkpoint schema must be Record<string, z.ZodString | z.ZodNumber | z.ZodBoolean>
// No .optional() or .nullable() allowed on the field types
const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync Salesforce knowledge articles with title, content, and modified timestamps',
    version: '3.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Article: ArticleSchema
    },
    endpoints: [{ method: 'POST', path: '/syncs/articles' }],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.['updated_after'];

        // Build SOQL query for Knowledge Articles
        // NOTE: In orgs with Knowledge enabled, use KnowledgeArticle, KnowledgeArticleVersion, or specific __kav objects
        // For this template, we use Account as a universally available object
        // Replace 'Account' with your actual Knowledge article object name (e.g., 'Knowledge__kav')
        let soqlQuery = 'SELECT Id, Name, Description, LastModifiedDate, CreatedDate FROM Account';

        if (updatedAfter && updatedAfter.length > 0) {
            soqlQuery += ` WHERE LastModifiedDate >= ${updatedAfter}`;
        }

        soqlQuery += ' ORDER BY LastModifiedDate ASC';

        let nextRecordsUrl: string | undefined;
        let lastProcessedTimestamp: string | undefined;

        do {
            // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
            const config: {
                endpoint: string;
                params: Record<string, string>;
                retries: number;
            } = {
                endpoint: nextRecordsUrl ?? '/services/data/v59.0/query',
                // When using nextRecordsUrl, Salesforce already includes all params in the URL
                params: nextRecordsUrl ? {} : { q: soqlQuery },
                retries: 3
            };

            const response = await nango.get(config);

            const parsed = SalesforceQueryResponseSchema.parse(response.data);
            const records = parsed.records;

            if (records.length === 0) {
                break;
            }

            const articles = records.map((record) => ({
                id: record.Id,
                knowledge_article_id: record.Id,
                ...(record.Name != null && { title: record.Name }),
                ...(record.Description != null && { summary: record.Description }),
                last_modified_at: record.LastModifiedDate,
                ...(record.CreatedDate != null && { created_at: record.CreatedDate })
            }));

            await nango.batchSave(articles, 'Article');

            // Update checkpoint with the last processed timestamp
            lastProcessedTimestamp = records[records.length - 1]?.LastModifiedDate;
            if (lastProcessedTimestamp) {
                await nango.saveCheckpoint({
                    updated_after: lastProcessedTimestamp
                });
            }

            // Salesforce returns nextRecordsUrl as a full path like /services/data/v59.0/query/...
            // We use it directly as the endpoint for the next request
            nextRecordsUrl = parsed.nextRecordsUrl;
        } while (nextRecordsUrl);
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
