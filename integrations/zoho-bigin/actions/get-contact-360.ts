import { z } from 'zod';
import { createAction } from 'nango';

const CONTACT_FIELDS = [
    'Owner',
    'First_Name',
    'Last_Name',
    'Full_Name',
    'Email',
    'Title',
    'Phone',
    'Home_Phone',
    'Mobile',
    'Account_Name',
    'Mailing_Street',
    'Mailing_City',
    'Mailing_State',
    'Mailing_Zip',
    'Mailing_Country',
    'Description',
    'Email_Opt_Out',
    'Created_By',
    'Modified_By',
    'Created_Time',
    'Modified_Time',
    'Last_Activity_Time'
];

const ACCOUNT_FIELDS = [
    'Owner',
    'Account_Name',
    'Phone',
    'Website',
    'Billing_Street',
    'Billing_City',
    'Billing_State',
    'Billing_Code',
    'Billing_Country',
    'Description',
    'Created_By',
    'Modified_By',
    'Created_Time',
    'Modified_Time',
    'Last_Activity_Time'
];

const PRODUCT_FIELDS = [
    'Owner',
    'Product_Name',
    'Product_Code',
    'Product_Active',
    'Product_Category',
    'Unit_Price',
    'Description',
    'Created_Time',
    'Modified_Time'
];

const OwnerSchema = z.object({
    id: z.string().describe('Owner or user ID. Example: "7618134000000627001".'),
    name: z.string().nullable().optional().describe('Owner or user display name. Example: "Nango Developer".'),
    email: z.string().nullable().optional().describe('Owner or user email address. Example: "api@nango.dev".')
});

const AccountRefSchema = z.object({
    id: z.string().describe('Linked company (account) ID. Example: "7618134000000632027".'),
    name: z.string().nullable().optional().describe('Linked company (account) display name. Example: "Zylker Corp".')
});

const ContactSchema = z.object({
    id: z.string().describe('Bigin contact ID. Example: "7618134000000632028".'),
    First_Name: z.string().nullable().optional().describe('Contact first name. Example: "Ted".'),
    Last_Name: z.string().nullable().optional().describe('Contact last name. Example: "Watson".'),
    Full_Name: z.string().nullable().optional().describe('Contact full name as assembled by Bigin. Example: "Ted Watson".'),
    Email: z.string().nullable().optional().describe('Contact email address. Example: "support@bigin.com".'),
    Title: z.string().nullable().optional().describe('Contact job title.'),
    Phone: z.string().nullable().optional().describe('Contact work phone number.'),
    Home_Phone: z.string().nullable().optional().describe('Contact home phone number.'),
    Mobile: z.string().nullable().optional().describe('Contact mobile phone number. Example: "609-884-0686".'),
    Account_Name: AccountRefSchema.nullable().optional().describe('Reference to the linked company (account), or null when the contact has no linked company.'),
    Mailing_Street: z.string().nullable().optional().describe('Mailing street address.'),
    Mailing_City: z.string().nullable().optional().describe('Mailing city.'),
    Mailing_State: z.string().nullable().optional().describe('Mailing state or region.'),
    Mailing_Zip: z.string().nullable().optional().describe('Mailing postal or ZIP code.'),
    Mailing_Country: z.string().nullable().optional().describe('Mailing country.'),
    Description: z.string().nullable().optional().describe('Free-text description of the contact.'),
    Email_Opt_Out: z.boolean().nullable().optional().describe('Whether the contact opted out of emails.'),
    Owner: OwnerSchema.nullable().optional().describe('Record owner.'),
    Created_By: OwnerSchema.nullable().optional().describe('User who created the contact.'),
    Modified_By: OwnerSchema.nullable().optional().describe('User who last modified the contact.'),
    Created_Time: z.string().nullable().optional().describe('Creation timestamp in ISO 8601 format. Example: "2026-10-07T03:21:34+03:00".'),
    Modified_Time: z.string().nullable().optional().describe('Last modification timestamp in ISO 8601 format. Example: "2026-10-07T03:21:34+03:00".'),
    Last_Activity_Time: z.string().nullable().optional().describe("Timestamp of the contact's most recent activity, in ISO 8601 format.")
});

const AccountSchema = z.object({
    id: z.string().describe('Bigin company (account) ID. Example: "7618134000000632027".'),
    Account_Name: z.string().nullable().optional().describe('Company name. Example: "Zylker Corp".'),
    Phone: z.string().nullable().optional().describe('Company phone number.'),
    Website: z.string().nullable().optional().describe('Company website URL.'),
    Billing_Street: z.string().nullable().optional().describe('Billing street address.'),
    Billing_City: z.string().nullable().optional().describe('Billing city.'),
    Billing_State: z.string().nullable().optional().describe('Billing state or region.'),
    Billing_Code: z.string().nullable().optional().describe('Billing postal or ZIP code.'),
    Billing_Country: z.string().nullable().optional().describe('Billing country.'),
    Description: z.string().nullable().optional().describe('Free-text description of the company.'),
    Owner: OwnerSchema.nullable().optional().describe('Record owner.'),
    Created_By: OwnerSchema.nullable().optional().describe('User who created the company.'),
    Modified_By: OwnerSchema.nullable().optional().describe('User who last modified the company.'),
    Created_Time: z.string().nullable().optional().describe('Creation timestamp in ISO 8601 format.'),
    Modified_Time: z.string().nullable().optional().describe('Last modification timestamp in ISO 8601 format.'),
    Last_Activity_Time: z.string().nullable().optional().describe("Timestamp of the company's most recent activity, in ISO 8601 format.")
});

const ProductSchema = z.object({
    id: z.string().describe('Bigin product ID. Example: "7618134000000647020".'),
    Product_Name: z.string().nullable().optional().describe('Product name. Example: "Nango Test Product".'),
    Product_Code: z.string().nullable().optional().describe('Product code or SKU. Example: "NTP-001".'),
    Product_Active: z.boolean().nullable().optional().describe('Whether the product is active.'),
    Product_Category: z.string().nullable().optional().describe('Product category, such as "Hardware" or "Software".'),
    Unit_Price: z.number().nullable().optional().describe('Unit price of the product. Example: 42.5.'),
    Description: z.string().nullable().optional().describe('Free-text description of the product.'),
    Owner: OwnerSchema.nullable().optional().describe('Record owner.'),
    Created_Time: z.string().nullable().optional().describe('Creation timestamp in ISO 8601 format.'),
    Modified_Time: z.string().nullable().optional().describe('Last modification timestamp in ISO 8601 format.')
});

const ContactEnvelopeSchema = z.object({
    data: z.array(ContactSchema)
});

const AccountEnvelopeSchema = z.object({
    data: z.array(AccountSchema)
});

const ProductEnvelopeSchema = z.object({
    data: z.array(ProductSchema),
    info: z
        .object({
            more_records: z.boolean().nullish(),
            next_page_token: z.string().nullish()
        })
        .nullish()
});

const InputSchema = z
    .object({
        contact_id: z.string().min(1).describe('Bigin contact ID to build the consolidated view for. Example: "7618134000000632028".')
    })
    .describe('Input for building a consolidated view of a single Bigin contact.');

const OutputSchema = z
    .object({
        found: z.boolean().describe('True when the contact exists; false when the contact ID does not resolve to a record.'),
        contact: ContactSchema.optional().describe("The contact's own fields. Present only when found is true."),
        account: AccountSchema.nullable()
            .optional()
            .describe('The company (account) linked to the contact. null when the contact has no linked company; omitted when found is false.'),
        products: z.array(ProductSchema).optional().describe('Every product linked to the contact. Empty when none are linked; omitted when found is false.')
    })
    .describe('Consolidated view of a Bigin contact, its linked company (account), and every product linked to it.');

/**
 * @tags: [read]
 * @tagReason: Reads the contact, its linked company (account), and its linked products from Bigin without mutating any data.
 * @pitfalls: A missing contact returns found:false instead of throwing; when found is true, account is null if the contact has no linked company and products is empty if none are linked.
 */
const action = createAction({
    description:
        'COMPOSITE: get a single consolidated view of a contact - its own fields, its linked company (account), and every product linked to it - in one call.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.bigin.com/developer/docs/apis/v2/get-records.html
        const contactResponse = await nango.get({
            endpoint: `/bigin/v2/Contacts/${encodeURIComponent(input.contact_id)}`,
            params: {
                fields: CONTACT_FIELDS.join(',')
            },
            retries: 3
        });

        if (contactResponse.status === 204) {
            return { found: false };
        }

        const contactEnvelope = ContactEnvelopeSchema.parse(contactResponse.data);
        const contact = contactEnvelope.data[0];

        if (contact === undefined) {
            return { found: false };
        }

        let account: z.infer<typeof AccountSchema> | null = null;
        const accountRef = contact.Account_Name;

        if (accountRef !== null && accountRef !== undefined) {
            // https://www.bigin.com/developer/docs/apis/v2/get-records.html
            const accountResponse = await nango.get({
                endpoint: `/bigin/v2/Accounts/${encodeURIComponent(accountRef.id)}`,
                params: {
                    fields: ACCOUNT_FIELDS.join(',')
                },
                retries: 3
            });

            if (accountResponse.status !== 204) {
                const accountEnvelope = AccountEnvelopeSchema.parse(accountResponse.data);
                const accountRecord = accountEnvelope.data[0];

                if (accountRecord !== undefined) {
                    account = accountRecord;
                }
            }
        }

        // Walk every related-records page so `products` holds every linked product.
        const products: z.infer<typeof ProductSchema>[] = [];
        let pageToken: string | undefined;

        do {
            // https://www.bigin.com/developer/docs/apis/v2/get-related-records.html
            const productsResponse = await nango.get({
                endpoint: `/bigin/v2/Contacts/${encodeURIComponent(input.contact_id)}/Products`,
                params: {
                    fields: PRODUCT_FIELDS.join(','),
                    // The page size is encoded in the token; Bigin ignores a token sent with a different per_page.
                    ...(pageToken !== undefined ? { page_token: pageToken } : { per_page: 200 })
                },
                retries: 3
            });
            pageToken = undefined;

            if (productsResponse.status === 204) {
                break;
            }

            const productsEnvelope = ProductEnvelopeSchema.parse(productsResponse.data);
            products.push(...productsEnvelope.data);

            if (productsEnvelope.info?.more_records === true) {
                const nextPageToken = productsEnvelope.info.next_page_token;
                if (!nextPageToken) {
                    throw new nango.ActionError({
                        type: 'invalid_response',
                        message: 'Bigin reported more linked products without a next_page_token.',
                        contact_id: input.contact_id
                    });
                }
                pageToken = nextPageToken;
            }
        } while (pageToken !== undefined);

        return {
            found: true,
            contact,
            account,
            products
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
