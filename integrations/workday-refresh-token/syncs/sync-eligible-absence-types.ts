import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const EligibleAbsenceTypeSchema = z
    .object({
        id: z.string().describe('Stable record key: compact JSON array string of workerId and absenceTypeId.'),
        unit: z.string().optional().describe('Explicit quantity unit of this type; omitted when unavailable and never inferred.'),
        category: z.string().optional().describe('Explicit provider absence category; omitted when unavailable.'),
        workerId: z.string().describe('Concrete worker API ID whose eligibility this record describes.'),
        descriptor: z.string().optional().describe('Type display text; omitted when unavailable.'),
        absenceTypeId: z.string().describe('Opaque provider eligible absence type ID for callable type lookups.')
    })
    .describe('A worker-specific eligible absence type, keyed by the owning worker and the absence type.');

const WorkdayConnectionConfigSchema = z.object({
    tenant: z.string().min(1)
});

const WorkdayInstanceReferenceSchema = z.object({
    id: z.string(),
    descriptor: z.string().optional().nullable()
});

const WorkdayWorkerSchema = z.object({
    id: z.string()
});

const WorkdayEligibleAbsenceTypeSchema = z.object({
    id: z.string(),
    descriptor: z.string().optional().nullable(),
    category: WorkdayInstanceReferenceSchema.optional().nullable(),
    unitOfTime: WorkdayInstanceReferenceSchema.optional().nullable()
});

const sync = createSync({
    description: 'Make worker-specific absence eligibility available as a replicated dataset.',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    models: {
        EligibleAbsenceType: EligibleAbsenceTypeSchema
    },

    exec: async (nango) => {
        // Full refresh: the Workday absenceManagement collections expose no changed-since filter,
        // delta feed, or deleted-records endpoint, so every run re-reads the whole dataset from the
        // first page and delete tracking reconciles records that disappeared. No cursor or progress
        // is persisted mid-scan; the run is atomic with respect to deletion detection.
        const connection = await nango.getConnection();
        const connectionConfig = WorkdayConnectionConfigSchema.safeParse(connection.connection_config);

        if (!connectionConfig.success) {
            throw new Error('The Workday tenant is missing from the connection configuration.');
        }

        const tenant = encodeURIComponent(connectionConfig.data.tenant);

        await nango.trackDeletesStart('EligibleAbsenceType');

        const workersConfig: ProxyConfiguration = {
            // https://community.workday.com/sites/default/files/file-hosting/restapi/index.html
            endpoint: `/absenceManagement/v5/${tenant}/workers`,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'data'
            },
            retries: 3
        };

        for await (const workersBatch of nango.paginate<unknown>(workersConfig)) {
            const workers = z.array(WorkdayWorkerSchema).parse(workersBatch);

            for (const worker of workers) {
                const eligibleTypesConfig: ProxyConfiguration = {
                    // https://community.workday.com/sites/default/files/file-hosting/restapi/index.html
                    endpoint: `/absenceManagement/v5/${tenant}/workers/${encodeURIComponent(worker.id)}/eligibleAbsenceTypes`,
                    paginate: {
                        type: 'offset',
                        offset_name_in_request: 'offset',
                        offset_start_value: 0,
                        offset_calculation_method: 'by-response-size',
                        limit_name_in_request: 'limit',
                        limit: 100,
                        response_path: 'data'
                    },
                    retries: 3
                };

                for await (const eligibleTypesBatch of nango.paginate<unknown>(eligibleTypesConfig)) {
                    const eligibleTypes = z.array(WorkdayEligibleAbsenceTypeSchema).parse(eligibleTypesBatch);

                    const records = eligibleTypes.map((absenceType) => ({
                        id: JSON.stringify([worker.id, absenceType.id]),
                        workerId: worker.id,
                        absenceTypeId: absenceType.id,
                        ...(absenceType.descriptor != null && { descriptor: absenceType.descriptor }),
                        ...(absenceType.category?.descriptor != null && { category: absenceType.category.descriptor }),
                        ...(absenceType.unitOfTime?.descriptor != null && { unit: absenceType.unitOfTime.descriptor })
                    }));

                    if (records.length > 0) {
                        await nango.batchSave(records, 'EligibleAbsenceType');
                    }
                }
            }
        }

        await nango.trackDeletesEnd('EligibleAbsenceType');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
