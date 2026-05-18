import { createSync } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    offset: z.number().int().nonnegative(),
    in_progress: z.boolean()
});

const ProviderCompanySchema = z.object({
    id: z.object({
        record_id: z.string()
    }),
    values: z
        .object({
            name: z
                .array(
                    z
                        .object({
                            value: z.string().optional()
                        })
                        .passthrough()
                )
                .optional()
        })
        .passthrough()
        .optional(),
    created_at: z.string()
});

const ProviderCompaniesResponseSchema = z.object({
    data: z.array(ProviderCompanySchema)
});

const CompanySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    created_at: z.string()
});

const sync = createSync({
    description: 'Sync Attio company records.',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Company: CompanySchema
    },

    endpoints: [
        // https://docs.attio.com/rest-api/endpoint-reference/records#list-records
        {
            method: 'POST',
            path: '/syncs/companies'
        }
    ],

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.partial().parse((await nango.getCheckpoint()) ?? {});
        let offset = checkpoint.offset ?? 0;
        const inProgress = checkpoint.in_progress ?? false;
        const limit = 100;

        // Attio's current record query uses limit/offset pagination and exposes
        // created_at in the provider response, so we keep this as a full refresh
        // and use checkpoints to resume an in-progress pass safely.
        if (!inProgress) {
            await nango.trackDeletesStart('Company');
        }

        let hasMore = true;

        while (hasMore) {
            const response = await nango.post({
                // https://docs.attio.com/rest-api/endpoint-reference/records/list-records
                endpoint: '/v2/objects/companies/records/query',
                data: {
                    sorts: [{ direction: 'asc', attribute: 'created_at' }],
                    limit,
                    offset
                },
                retries: 3
            });

            const parsed = ProviderCompaniesResponseSchema.parse(response.data);
            const page = parsed.data;
            const companies = page.map((record) => {
                const nameValue = record.values?.name?.find((entry) => entry.value != null);

                return {
                    id: record.id.record_id,
                    ...(nameValue?.value != null && { name: nameValue.value }),
                    created_at: record.created_at
                };
            });

            if (companies.length > 0) {
                await nango.batchSave(companies, 'Company');
            }

            if (page.length < limit) {
                hasMore = false;
            } else {
                offset += limit;
                await nango.saveCheckpoint({ offset, in_progress: true });
            }
        }

        await nango.trackDeletesEnd('Company');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
