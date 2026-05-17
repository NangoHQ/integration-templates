import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page: z.number().optional().describe('Page number for pagination. Default is 1.'),
    per_page: z.number().optional().describe('Number of records per page. Default is 200, maximum is 200.'),
    sort_by: z.string().optional().describe('Field name to sort by. Example: "Last_Name"'),
    sort_order: z.enum(['asc', 'desc']).optional().describe('Sort order. Default is "desc".'),
    fields: z.string().optional().describe('Comma-separated field API names to retrieve. Example: "Last_Name,Email,Phone"'),
    ids: z.string().optional().describe('Comma-separated contact IDs to retrieve specific records.'),
    converted: z.enum(['true', 'false', 'both']).optional().describe('Filter by converted status.'),
    approved: z.enum(['true', 'false', 'both']).optional().describe('Filter by approval status.'),
    cvid: z.string().optional().describe('Custom view ID to filter records.'),
    territory_id: z.string().optional().describe('Territory ID to filter records.')
});

const OwnerSchema = z.object({
    name: z.string().optional(),
    id: z.string(),
    email: z.string().optional()
});

const AccountSchema = z.object({
    name: z.string().optional(),
    id: z.string()
});

const ContactSchema = z.object({
    id: z.string(),
    Owner: OwnerSchema.nullable().optional(),
    Email: z.string().nullable().optional(),
    First_Name: z.string().nullable().optional(),
    Last_Name: z.string(),
    Full_Name: z.string().nullable().optional(),
    Phone: z.string().nullable().optional(),
    Mobile: z.string().nullable().optional(),
    Title: z.string().nullable().optional(),
    Department: z.string().nullable().optional(),
    Created_Time: z.string().nullable().optional(),
    Modified_Time: z.string().nullable().optional(),
    Created_By: OwnerSchema.nullable().optional(),
    Modified_By: OwnerSchema.nullable().optional(),
    Account_Name: AccountSchema.nullable().optional(),
    Description: z.string().nullable().optional(),
    Secondary_Email: z.string().nullable().optional(),
    Skype_ID: z.string().nullable().optional(),
    Twitter: z.string().nullable().optional(),
    Mailing_Street: z.string().nullable().optional(),
    Mailing_City: z.string().nullable().optional(),
    Mailing_State: z.string().nullable().optional(),
    Mailing_Zip: z.string().nullable().optional(),
    Mailing_Country: z.string().nullable().optional(),
    Email_Opt_Out: z.boolean().nullable().optional()
});

const InfoSchema = z.object({
    per_page: z.number(),
    count: z.number(),
    page: z.number(),
    more_records: z.boolean()
});

const ProviderResponseSchema = z.object({
    data: z.array(ContactSchema),
    info: InfoSchema.optional()
});

const OutputContactSchema = z.object({
    id: z.string(),
    owner_id: z.string().optional(),
    owner_name: z.string().optional(),
    owner_email: z.string().optional(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string(),
    full_name: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    title: z.string().optional(),
    department: z.string().optional(),
    created_time: z.string().optional(),
    modified_time: z.string().optional(),
    created_by_id: z.string().optional(),
    created_by_name: z.string().optional(),
    modified_by_id: z.string().optional(),
    modified_by_name: z.string().optional(),
    account_id: z.string().optional(),
    account_name: z.string().optional(),
    description: z.string().optional(),
    secondary_email: z.string().optional(),
    skype_id: z.string().optional(),
    twitter: z.string().optional(),
    mailing_street: z.string().optional(),
    mailing_city: z.string().optional(),
    mailing_state: z.string().optional(),
    mailing_zip: z.string().optional(),
    mailing_country: z.string().optional(),
    email_opt_out: z.boolean().optional()
});

const OutputSchema = z.object({
    contacts: z.array(OutputContactSchema),
    page: z.number(),
    per_page: z.number(),
    count: z.number(),
    has_more: z.boolean(),
    total_fetched: z.number().describe('Total number of contacts fetched in this request')
});

const action = createAction({
    description: 'List contacts from Zoho CRM with optional filtering and pagination.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-contacts',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.contacts.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.page !== undefined) {
            params['page'] = input.page;
        }
        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }
        if (input.sort_by !== undefined) {
            params['sort_by'] = input.sort_by;
        }
        if (input.sort_order !== undefined) {
            params['sort_order'] = input.sort_order;
        }
        if (input.fields !== undefined) {
            params['fields'] = input.fields;
        }
        if (input.ids !== undefined) {
            params['ids'] = input.ids;
        }
        if (input.converted !== undefined) {
            params['converted'] = input.converted;
        }
        if (input.approved !== undefined) {
            params['approved'] = input.approved;
        }
        if (input.cvid !== undefined) {
            params['cvid'] = input.cvid;
        }
        if (input.territory_id !== undefined) {
            params['territory_id'] = input.territory_id;
        }

        // https://www.zoho.com/crm/developer/docs/api/v2/get-records.html
        const response = await nango.get({
            endpoint: '/crm/v2/Contacts',
            params: params,
            retries: 3
        });

        const parsedResponse = ProviderResponseSchema.parse(response.data);
        const contacts = parsedResponse.data;
        const info = parsedResponse.info;

        const mappedContacts = contacts.map((contact) => {
            return {
                id: contact.id,
                ...(contact.Owner?.id != null && { owner_id: contact.Owner.id }),
                ...(contact.Owner?.name != null && { owner_name: contact.Owner.name }),
                ...(contact.Owner?.email != null && { owner_email: contact.Owner.email }),
                ...(contact.Email != null && { email: contact.Email }),
                ...(contact.First_Name != null && { first_name: contact.First_Name }),
                last_name: contact.Last_Name,
                ...(contact.Full_Name != null && { full_name: contact.Full_Name }),
                ...(contact.Phone != null && { phone: contact.Phone }),
                ...(contact.Mobile != null && { mobile: contact.Mobile }),
                ...(contact.Title != null && { title: contact.Title }),
                ...(contact.Department != null && { department: contact.Department }),
                ...(contact.Created_Time != null && { created_time: contact.Created_Time }),
                ...(contact.Modified_Time != null && { modified_time: contact.Modified_Time }),
                ...(contact.Created_By?.id != null && { created_by_id: contact.Created_By.id }),
                ...(contact.Created_By?.name != null && { created_by_name: contact.Created_By.name }),
                ...(contact.Modified_By?.id != null && { modified_by_id: contact.Modified_By.id }),
                ...(contact.Modified_By?.name != null && { modified_by_name: contact.Modified_By.name }),
                ...(contact.Account_Name?.id != null && { account_id: contact.Account_Name.id }),
                ...(contact.Account_Name?.name != null && { account_name: contact.Account_Name.name }),
                ...(contact.Description != null && { description: contact.Description }),
                ...(contact.Secondary_Email != null && { secondary_email: contact.Secondary_Email }),
                ...(contact.Skype_ID != null && { skype_id: contact.Skype_ID }),
                ...(contact.Twitter != null && { twitter: contact.Twitter }),
                ...(contact.Mailing_Street != null && { mailing_street: contact.Mailing_Street }),
                ...(contact.Mailing_City != null && { mailing_city: contact.Mailing_City }),
                ...(contact.Mailing_State != null && { mailing_state: contact.Mailing_State }),
                ...(contact.Mailing_Zip != null && { mailing_zip: contact.Mailing_Zip }),
                ...(contact.Mailing_Country != null && { mailing_country: contact.Mailing_Country }),
                ...(contact.Email_Opt_Out != null && { email_opt_out: contact.Email_Opt_Out })
            };
        });

        return {
            contacts: mappedContacts,
            page: info?.page ?? input.page ?? 1,
            per_page: info?.per_page ?? input.per_page ?? 200,
            count: info?.count ?? contacts.length,
            has_more: info?.more_records ?? false,
            total_fetched: contacts.length
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
