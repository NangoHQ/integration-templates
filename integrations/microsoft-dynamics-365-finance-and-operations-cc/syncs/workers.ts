import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const WorkerSchema = z.object({
    id: z.string(),
    personnel_number: z.string().optional(),
    name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    middle_name: z.string().optional(),
    worker_status: z.string().optional(),
    worker_type: z.string().optional(),
    birth_date: z.string().optional(),
    gender: z.string().optional(),
    marital_status: z.string().optional(),
    language_id: z.string().optional(),
    party_number: z.string().optional(),
    name_alias: z.string().optional(),
    known_as: z.string().optional(),
    original_hire_date_time: z.string().optional(),
    seniority_date: z.string().optional(),
    primary_contact_email: z.string().optional(),
    primary_contact_phone: z.string().optional(),
    address_city: z.string().optional(),
    address_country_region_id: z.string().optional(),
    office_location: z.string().optional()
});

const CheckpointSchema = z.object({
    skip: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync workers (employees)',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Worker: WorkerSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let skip = checkpoint.success ? checkpoint.data.skip : 0;

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/Workers',
            params: {
                $select:
                    'PersonnelNumber,Name,FirstName,LastName,MiddleName,WorkerStatus,WorkerType,BirthDate,Gender,MaritalStatus,LanguageId,PartyNumber,NameAlias,KnownAs,OriginalHireDateTime,SeniorityDate,PrimaryContactEmail,PrimaryContactPhone,AddressCity,AddressCountryRegionId,OfficeLocation',
                $orderby: 'PersonnelNumber asc'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_start_value: skip,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '$top',
                limit: 100,
                response_path: 'value'
            },
            retries: 3
        };

        // Fetch and validate the first page before starting delete tracking, so a failed/invalid
        // first response doesn't leave delete-tracking open with zero records enumerated.
        const iterator = nango.paginate(proxyConfig)[Symbol.asyncIterator]();
        let result = await iterator.next();
        let trackingStarted = false;

        while (!result.done) {
            const page = result.value;
            const workers = page.map((record: unknown) => {
                const parsed = WorkerResponseSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse worker: ${parsed.error.message}`);
                }
                const r = parsed.data;
                return {
                    id: r.PersonnelNumber,
                    ...(r.Name != null && { name: r.Name }),
                    ...(r.FirstName != null && { first_name: r.FirstName }),
                    ...(r.LastName != null && { last_name: r.LastName }),
                    ...(r.MiddleName != null && { middle_name: r.MiddleName }),
                    ...(r.WorkerStatus != null && { worker_status: r.WorkerStatus }),
                    ...(r.WorkerType != null && { worker_type: r.WorkerType }),
                    ...(r.BirthDate != null && { birth_date: r.BirthDate }),
                    ...(r.Gender != null && { gender: r.Gender }),
                    ...(r.MaritalStatus != null && { marital_status: r.MaritalStatus }),
                    ...(r.LanguageId != null && { language_id: r.LanguageId }),
                    ...(r.PartyNumber != null && { party_number: r.PartyNumber }),
                    ...(r.NameAlias != null && { name_alias: r.NameAlias }),
                    ...(r.KnownAs != null && { known_as: r.KnownAs }),
                    ...(r.OriginalHireDateTime != null && { original_hire_date_time: r.OriginalHireDateTime }),
                    ...(r.SeniorityDate != null && { seniority_date: r.SeniorityDate }),
                    ...(r.PrimaryContactEmail != null && { primary_contact_email: r.PrimaryContactEmail }),
                    ...(r.PrimaryContactPhone != null && { primary_contact_phone: r.PrimaryContactPhone }),
                    ...(r.AddressCity != null && { address_city: r.AddressCity }),
                    ...(r.AddressCountryRegionId != null && { address_country_region_id: r.AddressCountryRegionId }),
                    ...(r.OfficeLocation != null && { office_location: r.OfficeLocation })
                };
            });

            if (!trackingStarted) {
                await nango.trackDeletesStart('Worker');
                trackingStarted = true;
            }

            if (workers.length > 0) {
                await nango.batchSave(workers, 'Worker');
            }

            skip += page.length;
            await nango.saveCheckpoint({ skip });

            result = await iterator.next();
        }

        await nango.clearCheckpoint();
        if (trackingStarted) {
            await nango.trackDeletesEnd('Worker');
        }
    }
});

const WorkerResponseSchema = z.object({
    PersonnelNumber: z.string(),
    Name: z.string().optional().nullable(),
    FirstName: z.string().optional().nullable(),
    LastName: z.string().optional().nullable(),
    MiddleName: z.string().optional().nullable(),
    WorkerStatus: z.string().optional().nullable(),
    WorkerType: z.string().optional().nullable(),
    BirthDate: z.string().optional().nullable(),
    Gender: z.string().optional().nullable(),
    MaritalStatus: z.string().optional().nullable(),
    LanguageId: z.string().optional().nullable(),
    PartyNumber: z.string().optional().nullable(),
    NameAlias: z.string().optional().nullable(),
    KnownAs: z.string().optional().nullable(),
    OriginalHireDateTime: z.string().optional().nullable(),
    SeniorityDate: z.string().optional().nullable(),
    PrimaryContactEmail: z.string().optional().nullable(),
    PrimaryContactPhone: z.string().optional().nullable(),
    AddressCity: z.string().optional().nullable(),
    AddressCountryRegionId: z.string().optional().nullable(),
    OfficeLocation: z.string().optional().nullable()
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
