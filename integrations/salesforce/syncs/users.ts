import { createSync } from 'nango';
import { z } from 'zod';

/**
 * Salesforce User sync
 * Syncs Salesforce User records with profile, email, and active state fields.
 *
 * Change source: SystemModstamp field (timestamp-based filtering)
 * Checkpoint schema: { updated_after: string }
 * Request changes: Filter SOQL query with WHERE SystemModstamp >= updated_after
 * Pagination: Salesforce cursor pagination via nextRecordsUrl (manual loop)
 * Delete strategy: No explicit deleted record endpoint available in standard SOQL;
 *   using incremental sync without trackDeletesStart/trackDeletesEnd since
 *   Salesforce SOQL with timestamp filter returns only changed records.
 */

const UserSchema = z.object({
    id: z.string(),
    username: z.string().optional(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    is_active: z.boolean().optional(),
    profile_id: z.string().optional(),
    profile_name: z.string().optional(),
    system_modstamp: z.string()
});

// Checkpoint schema - fields must be non-optional per ZodCheckpoint type
const CheckpointSchema = z.object({
    updated_after: z.string()
});

// Salesforce SOQL query response structure
const SalesforceQueryResponseSchema = z.object({
    totalSize: z.number(),
    done: z.boolean(),
    nextRecordsUrl: z.string().optional(),
    records: z.array(
        z.object({
            Id: z.string(),
            Username: z.string().nullable().optional(),
            Email: z.string().nullable().optional(),
            FirstName: z.string().nullable().optional(),
            LastName: z.string().nullable().optional(),
            IsActive: z.boolean().nullable().optional(),
            ProfileId: z.string().nullable().optional(),
            Profile: z
                .object({
                    Name: z.string().nullable().optional()
                })
                .nullable()
                .optional(),
            SystemModstamp: z.string()
        })
    )
});

type CheckpointType = z.infer<typeof CheckpointSchema>;
type SalesforceQueryResponse = z.infer<typeof SalesforceQueryResponseSchema>;
const StoredCheckpointSchema = CheckpointSchema.partial();

const sync = createSync({
    description: 'Sync Salesforce User records with profile, email, and active state fields.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        User: UserSchema
    },
    endpoints: [{ method: 'POST', path: '/syncs/users' }],

    exec: async (nango) => {
        const checkpoint = StoredCheckpointSchema.parse((await nango.getCheckpoint()) ?? {});
        const updatedAfter = checkpoint.updated_after;

        // Build SOQL query
        // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
        const baseQuery = 'SELECT Id, Username, Email, FirstName, LastName, IsActive, ProfileId, Profile.Name, SystemModstamp FROM User';
        const whereClause = updatedAfter ? ` WHERE SystemModstamp >= ${updatedAfter}` : '';
        const soqlQuery = baseQuery + whereClause + ' ORDER BY SystemModstamp ASC';

        let nextRecordsUrl: string | undefined = `/services/data/v59.0/query?q=${encodeURIComponent(soqlQuery)}`;
        let lastProcessedTimestamp: string | undefined;

        // Manual pagination loop for Salesforce's nextRecordsUrl pattern
        while (nextRecordsUrl) {
            // https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_query.htm
            const response = await nango.get({
                endpoint: nextRecordsUrl,
                retries: 3
            });

            const parsed = SalesforceQueryResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse Salesforce query response: ${JSON.stringify(parsed.error.format())}`);
            }

            const data: SalesforceQueryResponse = parsed.data;
            const records = data.records;

            if (records.length === 0) {
                nextRecordsUrl = data.nextRecordsUrl;
                continue;
            }

            // Transform records
            const users: Array<z.infer<typeof UserSchema>> = [];
            for (const record of records) {
                users.push({
                    id: record.Id,
                    ...(record.Username && { username: record.Username }),
                    ...(record.Email && { email: record.Email }),
                    ...(record.FirstName && { first_name: record.FirstName }),
                    ...(record.LastName && { last_name: record.LastName }),
                    ...(record.IsActive !== undefined && record.IsActive !== null && { is_active: record.IsActive }),
                    ...(record.ProfileId && { profile_id: record.ProfileId }),
                    ...(record.Profile?.Name && { profile_name: record.Profile.Name }),
                    system_modstamp: record.SystemModstamp
                });
                lastProcessedTimestamp = record.SystemModstamp;
            }

            await nango.batchSave(users, 'User');

            // Save checkpoint after each page
            if (lastProcessedTimestamp) {
                const newCheckpoint: CheckpointType = {
                    updated_after: lastProcessedTimestamp
                };
                await nango.saveCheckpoint(newCheckpoint);
            }

            // Continue to next page if there is one
            nextRecordsUrl = data.nextRecordsUrl;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
