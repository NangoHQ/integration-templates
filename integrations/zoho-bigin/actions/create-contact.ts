import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        Last_Name: z.string().describe('Last name of the contact. This is the only field Bigin requires. Example: "Johnson"'),
        First_Name: z.string().optional().describe('First name of the contact. Example: "Sarah"'),
        Email: z.string().optional().describe('Email address of the contact. Example: "sarah.johnson@example.com"'),
        Mobile: z.string().optional().describe('Mobile phone number of the contact. Example: "+1 (555) 987-6543"'),
        Title: z.string().optional().describe('Job title of the contact. Example: "HR Director"'),
        Account_Name: z
            .string()
            .optional()
            .describe('ID of an existing company (Accounts module) to associate with the contact. Example: "7618134000000632027"'),
        Owner: z.string().optional().describe('ID of the Bigin user to assign as the record owner. Example: "7618134000000457001"'),
        Email_Opt_Out: z.boolean().optional().describe('Whether the contact has opted out of receiving emails.'),
        Description: z.string().optional().describe('Free-text description or notes about the contact.'),
        Mailing_Street: z.string().optional().describe('Mailing street address of the contact.'),
        Mailing_City: z.string().optional().describe('Mailing city of the contact.'),
        Mailing_State: z.string().optional().describe('Mailing state or province of the contact.'),
        Mailing_Country: z.string().optional().describe('Mailing country of the contact.'),
        Mailing_Zip: z.string().optional().describe('Mailing ZIP or postal code of the contact.'),
        Tag: z.array(z.string()).optional().describe('Tag names to apply to the contact. Example: ["Recruitment"]')
    })
    .describe('Fields used to create a new Bigin contact, optionally linked to an existing company by ID.');

const ProviderCreateResponseSchema = z.object({
    data: z
        .array(
            z.object({
                code: z.string().optional(),
                message: z.string().optional(),
                status: z.string().optional(),
                details: z
                    .object({
                        id: z.string().optional(),
                        Created_Time: z.string().nullable().optional(),
                        Modified_Time: z.string().nullable().optional()
                    })
                    .nullable()
                    .optional()
            })
        )
        .optional(),
    code: z.string().optional(),
    message: z.string().optional(),
    status: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the newly created contact.'),
        created_time: z.string().optional().describe('ISO 8601 timestamp of when the contact was created.'),
        modified_time: z.string().optional().describe('ISO 8601 timestamp of the most recent modification to the contact.')
    })
    .describe('The newly created contact, identified by its ID and creation/modification timestamps.');

/**
 * @tags: [write]
 * @tagReason: Creates a new contact record in Bigin through a provider mutation.
 * @pitfalls: Returns only the new contact's ID and timestamps, not the full record, so fetch the contact separately for complete data; Bigin also rejects the create with a duplicate-data error when a unique field value such as Email already exists on another contact.
 */
const action = createAction({
    description: 'Create a new contact, optionally linked to an existing Account by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.modules.contacts.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const record = {
            Last_Name: input.Last_Name,
            ...(input.First_Name !== undefined && { First_Name: input.First_Name }),
            ...(input.Email !== undefined && { Email: input.Email }),
            ...(input.Mobile !== undefined && { Mobile: input.Mobile }),
            ...(input.Title !== undefined && { Title: input.Title }),
            ...(input.Account_Name !== undefined && { Account_Name: { id: input.Account_Name } }),
            ...(input.Owner !== undefined && { Owner: { id: input.Owner } }),
            ...(input.Email_Opt_Out !== undefined && { Email_Opt_Out: input.Email_Opt_Out }),
            ...(input.Description !== undefined && { Description: input.Description }),
            ...(input.Mailing_Street !== undefined && { Mailing_Street: input.Mailing_Street }),
            ...(input.Mailing_City !== undefined && { Mailing_City: input.Mailing_City }),
            ...(input.Mailing_State !== undefined && { Mailing_State: input.Mailing_State }),
            ...(input.Mailing_Country !== undefined && { Mailing_Country: input.Mailing_Country }),
            ...(input.Mailing_Zip !== undefined && { Mailing_Zip: input.Mailing_Zip }),
            ...(input.Tag !== undefined && { Tag: input.Tag.map((name) => ({ name })) })
        };

        const response = await nango.post({
            // https://www.bigin.com/developer/docs/apis/v2/insert-records.html
            endpoint: '/bigin/v2/Contacts',
            data: { data: [record] },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- create is not idempotent; a retry after a lost response would insert a duplicate contact
            retries: 0
        });

        const parsed = ProviderCreateResponseSchema.parse(response.data);
        const created = parsed.data?.[0];

        if (!created || created.status !== 'success' || !created.details?.id) {
            throw new nango.ActionError({
                type: 'create_failed',
                // A success result without an id must not surface its success message (e.g. "record added") as the error.
                message:
                    created?.status === 'success'
                        ? 'Bigin did not return the created contact ID.'
                        : (created?.message ?? parsed.message ?? 'Bigin did not return a successful create response.'),
                code: created?.code ?? parsed.code
            });
        }

        return {
            id: created.details.id,
            ...(created.details.Created_Time != null && { created_time: created.details.Created_Time }),
            ...(created.details.Modified_Time != null && { modified_time: created.details.Modified_Time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
