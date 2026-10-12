import { z } from 'zod';
import { createAction } from 'nango';

const UserRefSchema = z
    .object({
        id: z.string().nullable().optional().describe('Bigin record ID of the related user.'),
        name: z.string().nullable().optional().describe('Display name of the related user.'),
        email: z.string().nullable().optional().describe('Email address of the related user when available.')
    })
    .describe('Reference to a Bigin user (owner, creator, or last modifier).');

const AccountRefSchema = z
    .object({
        id: z.string().nullable().optional().describe('Bigin record ID of the linked account (company).'),
        name: z.string().nullable().optional().describe('Display name of the linked account (company).')
    })
    .describe('Reference to the account (company) linked to a contact.');

const TagSchema = z
    .object({
        id: z.string().nullable().optional().describe('Bigin record ID of the tag.'),
        name: z.string().nullable().optional().describe('Display label of the tag.'),
        color_code: z.string().nullable().optional().describe('Color code of the tag, or null when the tag has no color set.')
    })
    .describe('A tag applied to a contact.');

const ContactSchema = z
    .object({
        id: z.string().describe('Unique Bigin contact record ID.'),
        First_Name: z.string().nullable().optional().describe('Contact first name.'),
        Last_Name: z.string().nullable().optional().describe('Contact last name.'),
        Full_Name: z.string().nullable().optional().describe('Contact full name as displayed in Bigin.'),
        Email: z.string().nullable().optional().describe('Primary email address of the contact.'),
        Phone: z.string().nullable().optional().describe('Primary phone number of the contact.'),
        Mobile: z.string().nullable().optional().describe('Mobile phone number of the contact.'),
        Home_Phone: z.string().nullable().optional().describe('Home phone number of the contact.'),
        Title: z.string().nullable().optional().describe('Job title of the contact.'),
        Description: z.string().nullable().optional().describe('Free-text description of the contact.'),
        Account_Name: AccountRefSchema.nullable().optional().describe('Account (company) linked to the contact, or null when none is linked.'),
        Owner: UserRefSchema.nullable().optional().describe('Bigin user who owns the contact record.'),
        Created_By: UserRefSchema.nullable().optional().describe('Bigin user who created the contact record.'),
        Modified_By: UserRefSchema.nullable().optional().describe('Bigin user who last modified the contact record.'),
        Mailing_Street: z.string().nullable().optional().describe('Mailing street address.'),
        Mailing_City: z.string().nullable().optional().describe('Mailing city.'),
        Mailing_State: z.string().nullable().optional().describe('Mailing state or province.'),
        Mailing_Zip: z.string().nullable().optional().describe('Mailing postal code.'),
        Mailing_Country: z.string().nullable().optional().describe('Mailing country.'),
        Email_Opt_Out: z.boolean().nullable().optional().describe('Whether the contact has opted out of email.'),
        Created_Time: z.string().nullable().optional().describe('ISO-8601 timestamp when the contact was created.'),
        Modified_Time: z.string().nullable().optional().describe('ISO-8601 timestamp when the contact was last modified.'),
        Tag: z.array(TagSchema).nullable().optional().describe('Tags applied to the contact.')
    })
    // Search returns every contact field, including custom fields; keep the ones not modeled above.
    .passthrough()
    .describe('A Bigin contact record returned by a search.');

const InputSchema = z
    .object({
        criteria: z
            .string()
            .optional()
            .describe('COQL-style criteria expression, for example "(Email:equals:foo@bar.com)". Provide exactly one of criteria, email, phone, or word.'),
        email: z
            .string()
            .optional()
            .describe('Email address to match against all contact email fields. Provide exactly one of criteria, email, phone, or word.'),
        phone: z
            .string()
            .optional()
            .describe('Phone number to match against all contact phone fields. Provide exactly one of criteria, email, phone, or word.'),
        word: z
            .string()
            .min(2)
            .optional()
            .describe('Free-text word to search for across the contact module, at least 2 characters. Provide exactly one of criteria, email, phone, or word.'),
        page: z.number().int().positive().optional().describe('Page number to retrieve, starting at 1. Omit for the first page.'),
        per_page: z.number().int().positive().max(200).optional().describe('Number of records to return per page (1-200). Omit for the provider default.')
    })
    .describe('Search parameters for Bigin contacts. Exactly one of criteria, email, phone, or word must be provided.');

const OutputSchema = z
    .object({
        contacts: z.array(ContactSchema).describe('Contacts matching the search query; empty when there are no matches.'),
        count: z.number().optional().describe('Number of records returned in this page.'),
        page: z.number().optional().describe('Page number of the returned results.'),
        per_page: z.number().optional().describe('Number of records requested per page.'),
        more_records: z.boolean().optional().describe('Whether more matching records are available on a subsequent page.')
    })
    .describe('Contacts matching the search query, plus pagination metadata.');

const SearchResponseSchema = z.object({
    data: z.array(ContactSchema).optional(),
    info: z
        .object({
            count: z.number().optional(),
            page: z.number().optional(),
            per_page: z.number().optional(),
            more_records: z.boolean().optional()
        })
        .optional()
});

/**
 * @tags: [read]
 * @tagReason: Performs a read-only search against Bigin contacts and returns matching records without mutating any provider data.
 * @pitfalls: Results come from an eventually-consistent search index, so contacts created or modified within roughly the last 10-20 seconds may not appear; zero matches return an empty contacts array rather than an error.
 */
const action = createAction({
    description: 'Search Bigin contacts by criteria expression, email, phone, or free-text word.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.modules.contacts.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const provided = [input.criteria, input.email, input.phone, input.word].filter((value) => value !== undefined);

        if (provided.length !== 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide exactly one of criteria, email, phone, or word.'
            });
        }

        // https://www.bigin.com/developer/docs/apis/v2/search-records.html
        const response = await nango.get({
            endpoint: '/bigin/v2/Contacts/search',
            params: {
                ...(input.criteria !== undefined && { criteria: input.criteria }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.phone !== undefined && { phone: input.phone }),
                ...(input.word !== undefined && { word: input.word }),
                ...(input.page !== undefined && { page: input.page }),
                ...(input.per_page !== undefined && { per_page: input.per_page })
            },
            retries: 3
        });

        if (response.status === 204 || response.data == null || response.data === '') {
            return { contacts: [] };
        }

        const parsed = SearchResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse the Bigin contacts search response.',
                details: parsed.error.message
            });
        }

        const { data, info } = parsed.data;

        return {
            contacts: data ?? [],
            ...(info?.count != null && { count: info.count }),
            ...(info?.page != null && { page: info.page }),
            ...(info?.per_page != null && { per_page: info.per_page }),
            ...(info?.more_records != null && { more_records: info.more_records })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
