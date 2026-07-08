import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderMandateMigrationCandidateSchema = z
    .object({
        id: z.number().int(),
        status: z.string().nullish(),
        direct_debit_method: z.string().nullish(),
        signed_at: z.string().nullish(),
        migrated_at: z.string().nullish(),
        migration_started_at: z.string().nullish(),
        created_at: z.string().nullish(),
        updated_at: z.string().nullish()
    })
    .passthrough();

type ProviderMandateMigrationCandidate = z.infer<typeof ProviderMandateMigrationCandidateSchema>;

const MandateMigrationCandidateSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    direct_debit_method: z.string().optional(),
    signed_at: z.string().optional(),
    migrated_at: z.string().optional(),
    migration_started_at: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ProviderErrorSchema = z.object({
    status: z.number().optional(),
    response: z
        .object({
            status: z.number().optional()
        })
        .optional()
});

function getErrorStatus(err: unknown): number | undefined {
    const parsed = ProviderErrorSchema.safeParse(err);
    if (parsed.success) {
        return parsed.data.status ?? parsed.data.response?.status;
    }
    return undefined;
}

const sync = createSync({
    description: 'Sync mandates eligible for Pro Account migration.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        MandateMigrationCandidate: MandateMigrationCandidateSchema
    },

    exec: async (nango) => {
        // https://pennylane.readme.io/reference/getproaccountmandatemigrations
        const proxyConfig: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getproaccountmandatemigrations
            endpoint: '/api/external/v2/pro_account/mandate_migrations',

            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'metadata.next_cursor',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        let deleteTrackingStarted = false;

        try {
            for await (const page of nango.paginate<ProviderMandateMigrationCandidate>(proxyConfig)) {
                if (!deleteTrackingStarted) {
                    await nango.trackDeletesStart('MandateMigrationCandidate');
                    deleteTrackingStarted = true;
                }

                const candidates = page.map((record) => {
                    const parsed = ProviderMandateMigrationCandidateSchema.safeParse(record);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse mandate migration candidate: ${parsed.error.message}`);
                    }

                    const item = parsed.data;
                    return {
                        id: String(item.id),
                        ...(item.status != null && { status: item.status }),
                        ...(item.direct_debit_method != null && { direct_debit_method: item.direct_debit_method }),
                        ...(item.signed_at != null && { signed_at: item.signed_at }),
                        ...(item.migrated_at != null && { migrated_at: item.migrated_at }),
                        ...(item.migration_started_at != null && { migration_started_at: item.migration_started_at }),
                        ...(item.created_at != null && { created_at: item.created_at }),
                        ...(item.updated_at != null && { updated_at: item.updated_at })
                    };
                });

                if (candidates.length > 0) {
                    await nango.batchSave(candidates, 'MandateMigrationCandidate');
                }
            }
        } catch (err) {
            // @allowTryCatch The Pro Account endpoint returns 404 with a JSON body when the company
            // does not have a Pro Account configured. Treating this as a graceful empty sync avoids
            // false deletion tracking and hard failures.
            const status = getErrorStatus(err);
            if (status === 404) {
                return;
            }

            throw err;
        }

        if (deleteTrackingStarted) {
            await nango.trackDeletesEnd('MandateMigrationCandidate');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
