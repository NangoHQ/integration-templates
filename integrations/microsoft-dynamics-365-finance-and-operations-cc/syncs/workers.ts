import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderWorkerSchema = z.object({
    PersonnelNumber: z.string(),
    PartyNumber: z.string().optional(),
    Name: z.string().optional(),
    NameAlias: z.string().optional(),
    FirstName: z.string().optional(),
    MiddleName: z.string().optional(),
    LastName: z.string().optional(),
    KnownAs: z.string().optional(),
    BirthDate: z.string().optional(),
    Gender: z.string().optional(),
    MaritalStatus: z.string().optional(),
    WorkerStatus: z.string().optional(),
    WorkerType: z.string().optional(),
    OriginalHireDateTime: z.string().optional(),
    AnniversaryDateTime: z.string().optional(),
    SeniorityDate: z.string().optional(),
    IsDisabled: z.string().optional(),
    IsFulltimeStudent: z.string().optional(),
    AllowRehire: z.string().optional(),
    DeceasedDate: z.string().optional(),
    PrimaryContactEmail: z.string().optional(),
    PrimaryContactEmailDescription: z.string().optional(),
    PrimaryContactPhone: z.string().optional(),
    PrimaryContactPhoneDescription: z.string().optional(),
    PrimaryContactPhoneExtension: z.string().optional(),
    PrimaryContactPhoneIsMobile: z.string().optional(),
    AddressCity: z.string().optional(),
    AddressState: z.string().optional(),
    AddressCountryRegionId: z.string().optional(),
    AddressZipCode: z.string().optional(),
    AddressStreet: z.string().optional(),
    OfficeLocation: z.string().optional(),
    OfficeLocationId: z.string().optional(),
    TitleId: z.string().optional(),
    ProfessionalTitle: z.string().optional(),
    PersonalTitle: z.string().optional(),
    LanguageId: z.string().optional(),
    NativeLanguageId: z.string().optional(),
    User: z.string().optional(),
    ObjectId: z.string().optional(),
    IdentityEmail: z.string().optional(),
    IdentityProvider: z.string().optional(),
    NumberOfDependents: z.number().optional(),
    NationalityCountryRegion: z.string().optional(),
    CitizenshipCountryRegion: z.string().optional()
});

const WorkerSchema = z.object({
    id: z.string(),
    personnelNumber: z.string(),
    partyNumber: z.string().optional(),
    name: z.string().optional(),
    nameAlias: z.string().optional(),
    firstName: z.string().optional(),
    middleName: z.string().optional(),
    lastName: z.string().optional(),
    knownAs: z.string().optional(),
    birthDate: z.string().optional(),
    gender: z.string().optional(),
    maritalStatus: z.string().optional(),
    workerStatus: z.string().optional(),
    workerType: z.string().optional(),
    originalHireDateTime: z.string().optional(),
    anniversaryDateTime: z.string().optional(),
    seniorityDate: z.string().optional(),
    isDisabled: z.boolean().optional(),
    isFulltimeStudent: z.boolean().optional(),
    allowRehire: z.boolean().optional(),
    deceasedDate: z.string().optional(),
    primaryContactEmail: z.string().optional(),
    primaryContactEmailDescription: z.string().optional(),
    primaryContactPhone: z.string().optional(),
    primaryContactPhoneDescription: z.string().optional(),
    primaryContactPhoneExtension: z.string().optional(),
    primaryContactPhoneIsMobile: z.boolean().optional(),
    addressCity: z.string().optional(),
    addressState: z.string().optional(),
    addressCountryRegionId: z.string().optional(),
    addressZipCode: z.string().optional(),
    addressStreet: z.string().optional(),
    officeLocation: z.string().optional(),
    officeLocationId: z.string().optional(),
    titleId: z.string().optional(),
    professionalTitle: z.string().optional(),
    personalTitle: z.string().optional(),
    languageId: z.string().optional(),
    nativeLanguageId: z.string().optional(),
    user: z.string().optional(),
    objectId: z.string().optional(),
    identityEmail: z.string().optional(),
    identityProvider: z.string().optional(),
    numberOfDependents: z.number().optional(),
    nationalityCountryRegion: z.string().optional(),
    citizenshipCountryRegion: z.string().optional()
});

const CheckpointSchema = z.object({
    offset: z.number().int().min(0)
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
        // Blocker: Workers exposes no filterable modified timestamp in this
        // environment, so full refresh with delete tracking is required.
        // Persist the current $skip offset so an interrupted crawl can resume.
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let offset = checkpoint.success ? checkpoint.data.offset : 0;
        let trackingStarted = offset > 0;

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/Workers',
            params: {
                $select:
                    'PersonnelNumber,PartyNumber,Name,NameAlias,FirstName,MiddleName,LastName,KnownAs,BirthDate,Gender,MaritalStatus,WorkerStatus,WorkerType,OriginalHireDateTime,AnniversaryDateTime,SeniorityDate,IsDisabled,IsFulltimeStudent,AllowRehire,DeceasedDate,PrimaryContactEmail,PrimaryContactEmailDescription,PrimaryContactPhone,PrimaryContactPhoneDescription,PrimaryContactPhoneExtension,PrimaryContactPhoneIsMobile,AddressCity,AddressState,AddressCountryRegionId,AddressZipCode,AddressStreet,OfficeLocation,OfficeLocationId,TitleId,ProfessionalTitle,PersonalTitle,LanguageId,NativeLanguageId,User,ObjectId,IdentityEmail,IdentityProvider,NumberOfDependents,NationalityCountryRegion,CitizenshipCountryRegion',
                $orderby: 'PersonnelNumber asc'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '$skip',
                offset_start_value: offset,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '$top',
                limit: 1000,
                response_path: 'value'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderWorkerSchema).parse(page);

            const workers = parsed.map((record) => ({
                id: record.PersonnelNumber,
                personnelNumber: record.PersonnelNumber,
                partyNumber: record.PartyNumber,
                name: record.Name,
                nameAlias: record.NameAlias,
                firstName: record.FirstName,
                middleName: record.MiddleName,
                lastName: record.LastName,
                knownAs: record.KnownAs,
                birthDate: record.BirthDate,
                gender: record.Gender,
                maritalStatus: record.MaritalStatus,
                workerStatus: record.WorkerStatus,
                workerType: record.WorkerType,
                originalHireDateTime: record.OriginalHireDateTime,
                anniversaryDateTime: record.AnniversaryDateTime,
                seniorityDate: record.SeniorityDate,
                isDisabled: record.IsDisabled === 'Yes',
                isFulltimeStudent: record.IsFulltimeStudent === 'Yes',
                allowRehire: record.AllowRehire === 'Yes',
                deceasedDate: record.DeceasedDate,
                primaryContactEmail: record.PrimaryContactEmail,
                primaryContactEmailDescription: record.PrimaryContactEmailDescription,
                primaryContactPhone: record.PrimaryContactPhone,
                primaryContactPhoneDescription: record.PrimaryContactPhoneDescription,
                primaryContactPhoneExtension: record.PrimaryContactPhoneExtension,
                primaryContactPhoneIsMobile: record.PrimaryContactPhoneIsMobile === 'Yes',
                addressCity: record.AddressCity,
                addressState: record.AddressState,
                addressCountryRegionId: record.AddressCountryRegionId,
                addressZipCode: record.AddressZipCode,
                addressStreet: record.AddressStreet,
                officeLocation: record.OfficeLocation,
                officeLocationId: record.OfficeLocationId,
                titleId: record.TitleId,
                professionalTitle: record.ProfessionalTitle,
                personalTitle: record.PersonalTitle,
                languageId: record.LanguageId,
                nativeLanguageId: record.NativeLanguageId,
                user: record.User,
                objectId: record.ObjectId,
                identityEmail: record.IdentityEmail,
                identityProvider: record.IdentityProvider,
                numberOfDependents: record.NumberOfDependents,
                nationalityCountryRegion: record.NationalityCountryRegion,
                citizenshipCountryRegion: record.CitizenshipCountryRegion
            }));

            if (!trackingStarted && workers.length > 0) {
                await nango.trackDeletesStart('Worker');
                trackingStarted = true;
            }

            if (workers.length > 0) {
                await nango.batchSave(workers, 'Worker');
            }

            offset += page.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        if (trackingStarted) {
            await nango.trackDeletesEnd('Worker');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
