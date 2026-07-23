import { z } from 'zod';
import { createAction } from 'nango';

const PAGE_SIZE = 100;

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (skip value) from the previous response. Omit for the first page.')
});

const ProviderWorkerSchema = z
    .object({
        PersonnelNumber: z.string().optional().nullable(),
        Name: z.string().optional().nullable(),
        FirstName: z.string().optional().nullable(),
        MiddleName: z.string().optional().nullable(),
        LastName: z.string().optional().nullable(),
        WorkerStatus: z.string().optional().nullable(),
        WorkerType: z.string().optional().nullable(),
        OriginalHireDateTime: z.string().optional().nullable(),
        BirthDate: z.string().optional().nullable(),
        PrimaryContactEmail: z.string().optional().nullable(),
        PrimaryContactPhone: z.string().optional().nullable(),
        PrimaryContactPhoneExtension: z.string().optional().nullable(),
        Gender: z.string().optional().nullable(),
        MaritalStatus: z.string().optional().nullable(),
        TitleId: z.string().optional().nullable(),
        ProfessionalTitle: z.string().optional().nullable(),
        LanguageId: z.string().optional().nullable(),
        OfficeLocation: z.string().optional().nullable(),
        AddressCity: z.string().optional().nullable(),
        AddressCountryRegionId: z.string().optional().nullable(),
        AddressStreet: z.string().optional().nullable(),
        AddressZipCode: z.string().optional().nullable(),
        PartyNumber: z.string().optional().nullable(),
        NameAlias: z.string().optional().nullable(),
        KnownAs: z.string().optional().nullable()
    })
    .passthrough();

const WorkerSchema = z.object({
    personnel_number: z.string().optional(),
    name: z.string().optional(),
    first_name: z.string().optional(),
    middle_name: z.string().optional(),
    last_name: z.string().optional(),
    worker_status: z.string().optional(),
    worker_type: z.string().optional(),
    original_hire_date: z.string().optional(),
    birth_date: z.string().optional(),
    primary_contact_email: z.string().optional(),
    primary_contact_phone: z.string().optional(),
    primary_contact_phone_extension: z.string().optional(),
    gender: z.string().optional(),
    marital_status: z.string().optional(),
    title_id: z.string().optional(),
    professional_title: z.string().optional(),
    language_id: z.string().optional(),
    office_location: z.string().optional(),
    address_city: z.string().optional(),
    address_country_region_id: z.string().optional(),
    address_street: z.string().optional(),
    address_zip_code: z.string().optional(),
    party_number: z.string().optional(),
    name_alias: z.string().optional(),
    known_as: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(WorkerSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List workers (employees).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (isNaN(skip) || skip < 0) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a non-negative integer string'
            });
        }

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/data-entities/odata
            endpoint: '/data/Workers',
            params: {
                $top: String(PAGE_SIZE),
                $skip: String(skip),
                $select:
                    'PersonnelNumber,Name,FirstName,MiddleName,LastName,WorkerStatus,WorkerType,OriginalHireDateTime,BirthDate,PrimaryContactEmail,PrimaryContactPhone,PrimaryContactPhoneExtension,Gender,MaritalStatus,TitleId,ProfessionalTitle,LanguageId,OfficeLocation,AddressCity,AddressCountryRegionId,AddressStreet,AddressZipCode,PartyNumber,NameAlias,KnownAs',
                $orderby: 'PersonnelNumber asc'
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                value: z.array(z.unknown()),
                '@odata.nextLink': z.string().optional()
            })
            .parse(response.data);

        const items = providerResponse.value.map((raw: unknown) => {
            const worker = ProviderWorkerSchema.parse(raw);
            return {
                ...(worker.PersonnelNumber != null && { personnel_number: worker.PersonnelNumber }),
                ...(worker.Name != null && { name: worker.Name }),
                ...(worker.FirstName != null && { first_name: worker.FirstName }),
                ...(worker.MiddleName != null && { middle_name: worker.MiddleName }),
                ...(worker.LastName != null && { last_name: worker.LastName }),
                ...(worker.WorkerStatus != null && { worker_status: worker.WorkerStatus }),
                ...(worker.WorkerType != null && { worker_type: worker.WorkerType }),
                ...(worker.OriginalHireDateTime != null && { original_hire_date: worker.OriginalHireDateTime }),
                ...(worker.BirthDate != null && { birth_date: worker.BirthDate }),
                ...(worker.PrimaryContactEmail != null && { primary_contact_email: worker.PrimaryContactEmail }),
                ...(worker.PrimaryContactPhone != null && { primary_contact_phone: worker.PrimaryContactPhone }),
                ...(worker.PrimaryContactPhoneExtension != null && { primary_contact_phone_extension: worker.PrimaryContactPhoneExtension }),
                ...(worker.Gender != null && { gender: worker.Gender }),
                ...(worker.MaritalStatus != null && { marital_status: worker.MaritalStatus }),
                ...(worker.TitleId != null && { title_id: worker.TitleId }),
                ...(worker.ProfessionalTitle != null && { professional_title: worker.ProfessionalTitle }),
                ...(worker.LanguageId != null && { language_id: worker.LanguageId }),
                ...(worker.OfficeLocation != null && { office_location: worker.OfficeLocation }),
                ...(worker.AddressCity != null && { address_city: worker.AddressCity }),
                ...(worker.AddressCountryRegionId != null && { address_country_region_id: worker.AddressCountryRegionId }),
                ...(worker.AddressStreet != null && { address_street: worker.AddressStreet }),
                ...(worker.AddressZipCode != null && { address_zip_code: worker.AddressZipCode }),
                ...(worker.PartyNumber != null && { party_number: worker.PartyNumber }),
                ...(worker.NameAlias != null && { name_alias: worker.NameAlias }),
                ...(worker.KnownAs != null && { known_as: worker.KnownAs })
            };
        });

        let nextCursor: string | undefined;
        if (providerResponse['@odata.nextLink'] != null) {
            // Server explicitly says there's more — trust it, and try to extract the real $skip it wants us to use next.
            const nextUrl = new URL(providerResponse['@odata.nextLink']);
            const skipParam = nextUrl.searchParams.get('$skip');
            nextCursor = skipParam ?? String(skip + items.length);
        } else if (items.length === PAGE_SIZE) {
            // No explicit nextLink, but we got a full page — assume there may be more.
            nextCursor = String(skip + PAGE_SIZE);
        }

        return {
            items,
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
