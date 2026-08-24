import { createSync } from 'nango';
import { z } from 'zod';

const ProviderLegalEntitySchema = z.object({
    LegalEntityId: z.string(),
    Name: z.string().nullish(),
    NameAlias: z.string().nullish(),
    CompanyType: z.string().nullish(),
    LanguageId: z.string().nullish(),
    TimeZone: z.string().nullish(),
    CompanyName: z.string().nullish(),
    CompanyCountry: z.string().nullish(),
    CurrencyCode: z.string().nullish(),
    ChartOfAccounts: z.string().nullish(),
    RegistrationNumber: z.string().nullish(),
    VATNum: z.string().nullish(),
    Rfc: z.string().nullish(),
    StateInscription: z.string().nullish(),
    AddressStreet: z.string().nullish(),
    AddressCity: z.string().nullish(),
    AddressState: z.string().nullish(),
    AddressZipCode: z.string().nullish(),
    AddressCountryRegionId: z.string().nullish(),
    PrimaryContactEmail: z.string().nullish(),
    PrimaryContactPhone: z.string().nullish(),
    StartDateOfBusiness: z.string().nullish(),
    AddressValidFrom: z.string().nullish(),
    AddressValidTo: z.string().nullish()
});

const LegalEntitySchema = z.object({
    id: z.string(),
    legalEntityId: z.string().optional(),
    name: z.string().optional(),
    nameAlias: z.string().optional(),
    companyType: z.string().optional(),
    languageId: z.string().optional(),
    timeZone: z.string().optional(),
    companyName: z.string().optional(),
    companyCountry: z.string().optional(),
    currencyCode: z.string().optional(),
    chartOfAccounts: z.string().optional(),
    registrationNumber: z.string().optional(),
    vatNum: z.string().optional(),
    rfc: z.string().optional(),
    stateInscription: z.string().optional(),
    addressStreet: z.string().optional(),
    addressCity: z.string().optional(),
    addressState: z.string().optional(),
    addressZipCode: z.string().optional(),
    addressCountryRegionId: z.string().optional(),
    primaryContactEmail: z.string().optional(),
    primaryContactPhone: z.string().optional(),
    startDateOfBusiness: z.string().optional(),
    addressValidFrom: z.string().optional(),
    addressValidTo: z.string().optional()
});

const CheckpointSchema = z.object({
    offset: z.number().int().min(0)
});

const sync = createSync({
    description: 'Sync legal entities (companies/data areas).',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        LegalEntity: LegalEntitySchema
    },

    exec: async (nango) => {
        // Blocker: LegalEntities exposes no modified-timestamp field in this environment,
        // so we must use full-refresh with delete tracking.
        // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
        const checkpoint = CheckpointSchema.safeParse(await nango.getCheckpoint());
        let offset = checkpoint.success ? checkpoint.data.offset : 0;

        const limit = 1000;
        let hasMore = true;

        await nango.trackDeletesStart('LegalEntity');

        while (hasMore) {
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            const response = await nango.get({
                endpoint: '/data/LegalEntities',
                params: {
                    $top: String(limit),
                    $skip: String(offset)
                },
                retries: 3
            });

            const rawData = response.data;
            if (!rawData || typeof rawData !== 'object' || !Array.isArray(rawData.value)) {
                throw new Error('Unexpected response shape from LegalEntities endpoint');
            }

            const page = rawData.value;

            const legalEntities = page.map((raw: unknown) => {
                const parsed = ProviderLegalEntitySchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse legal entity: ${parsed.error.message}`);
                }

                const record = parsed.data;
                return {
                    id: record.LegalEntityId,
                    legalEntityId: record.LegalEntityId,
                    ...(record.Name != null && { name: record.Name }),
                    ...(record.NameAlias != null && { nameAlias: record.NameAlias }),
                    ...(record.CompanyType != null && { companyType: record.CompanyType }),
                    ...(record.LanguageId != null && { languageId: record.LanguageId }),
                    ...(record.TimeZone != null && { timeZone: record.TimeZone }),
                    ...(record.CompanyName != null && { companyName: record.CompanyName }),
                    ...(record.CompanyCountry != null && { companyCountry: record.CompanyCountry }),
                    ...(record.CurrencyCode != null && { currencyCode: record.CurrencyCode }),
                    ...(record.ChartOfAccounts != null && { chartOfAccounts: record.ChartOfAccounts }),
                    ...(record.RegistrationNumber != null && { registrationNumber: record.RegistrationNumber }),
                    ...(record.VATNum != null && { vatNum: record.VATNum }),
                    ...(record.Rfc != null && { rfc: record.Rfc }),
                    ...(record.StateInscription != null && { stateInscription: record.StateInscription }),
                    ...(record.AddressStreet != null && { addressStreet: record.AddressStreet }),
                    ...(record.AddressCity != null && { addressCity: record.AddressCity }),
                    ...(record.AddressState != null && { addressState: record.AddressState }),
                    ...(record.AddressZipCode != null && { addressZipCode: record.AddressZipCode }),
                    ...(record.AddressCountryRegionId != null && { addressCountryRegionId: record.AddressCountryRegionId }),
                    ...(record.PrimaryContactEmail != null && { primaryContactEmail: record.PrimaryContactEmail }),
                    ...(record.PrimaryContactPhone != null && { primaryContactPhone: record.PrimaryContactPhone }),
                    ...(record.StartDateOfBusiness != null && { startDateOfBusiness: record.StartDateOfBusiness }),
                    ...(record.AddressValidFrom != null && { addressValidFrom: record.AddressValidFrom }),
                    ...(record.AddressValidTo != null && { addressValidTo: record.AddressValidTo })
                };
            });

            if (legalEntities.length > 0) {
                await nango.batchSave(legalEntities, 'LegalEntity');
            }

            offset += limit;
            await nango.saveCheckpoint({ offset });

            if (page.length < limit) {
                hasMore = false;
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('LegalEntity');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
