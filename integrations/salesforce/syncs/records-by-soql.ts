import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    soql_query: z.string().min(1),
    api_version: z.string().optional(),
    timestamp_field: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    next_records_url: z.string()
});

const SalesforceRecordSchema = z.record(z.string(), z.unknown());

const SalesforceQueryResponseSchema = z.object({
    totalSize: z.number(),
    done: z.boolean(),
    records: z.array(SalesforceRecordSchema),
    nextRecordsUrl: z.string().optional()
});

const RecordSchema = z.object({
    id: z.string(),
    raw: z.record(z.string(), z.unknown())
});

const sync = createSync({
    description: 'Sync arbitrary Salesforce records from a caller-provided SOQL query',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            path: '/syncs/records-by-soql',
            method: 'POST'
        }
    ],
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Record: RecordSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const checkpoint = await nango.getCheckpoint();

        const validatedMetadata = MetadataSchema.parse(metadata);
        const validatedCheckpoint = checkpoint && Object.keys(checkpoint).length > 0 ? CheckpointSchema.parse(checkpoint) : undefined;

        const apiVersion = validatedMetadata.api_version || 'v59.0';
        const timestampField = validatedMetadata.timestamp_field || 'LastModifiedDate';
        let soqlQuery = validatedMetadata.soql_query;

        const updatedAfter = validatedCheckpoint?.updated_after;
        const hasCheckpoint = updatedAfter !== undefined && updatedAfter !== '';
        const hasWhereClause = soqlQuery.toLowerCase().includes(' where ');
        const hasTimestampField = soqlQuery.toLowerCase().includes(timestampField.toLowerCase());

        if (hasCheckpoint && hasTimestampField && !hasWhereClause) {
            soqlQuery = `${soqlQuery} WHERE ${timestampField} > ${updatedAfter}`;
        }

        let nextRecordsUrl = validatedCheckpoint?.next_records_url || undefined;
        let hasMoreRecords = true;
        let lastTimestamp: string | undefined;

        while (hasMoreRecords) {
            let response;

            if (nextRecordsUrl) {
                // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
                const proxyConfig = {
                    endpoint: nextRecordsUrl,
                    retries: 3
                };

                response = await nango.get(proxyConfig);
            } else {
                // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
                const proxyConfig = {
                    endpoint: `/services/data/${encodeURIComponent(apiVersion)}/query`,
                    params: {
                        q: soqlQuery
                    },
                    retries: 3
                };

                response = await nango.get(proxyConfig);
            }

            const parsedResponse = SalesforceQueryResponseSchema.parse(response.data);
            const records = parsedResponse.records;

            if (records.length === 0) {
                hasMoreRecords = false;
                break;
            }

            const transformedRecords = records.map((record) => {
                const recordId = record['Id'];
                if (typeof recordId !== 'string') {
                    throw new Error('Record missing required Id field');
                }
                return {
                    id: recordId,
                    raw: record
                };
            });

            await nango.batchSave(transformedRecords, 'Record');

            if (hasTimestampField) {
                const lastRecord = records[records.length - 1];
                if (lastRecord !== undefined) {
                    const timestampValue = lastRecord[timestampField];
                    if (typeof timestampValue === 'string') {
                        lastTimestamp = timestampValue;
                    }
                }
            }

            if (parsedResponse.nextRecordsUrl) {
                nextRecordsUrl = parsedResponse.nextRecordsUrl;
                await nango.saveCheckpoint({
                    updated_after: lastTimestamp || '',
                    next_records_url: nextRecordsUrl
                });
            } else {
                hasMoreRecords = false;
                if (lastTimestamp !== undefined) {
                    await nango.saveCheckpoint({
                        updated_after: lastTimestamp,
                        next_records_url: ''
                    });
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
