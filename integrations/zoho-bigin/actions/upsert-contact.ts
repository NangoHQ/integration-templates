import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        Last_Name: z
            .string()
            .nullable()
            .optional()
            .describe('Last name of the contact. Required by Bigin when the upsert inserts a new contact. Example: "Johnson"'),
        First_Name: z.string().nullable().optional().describe('First name of the contact. Example: "Sarah"'),
        Email: z
            .string()
            .nullable()
            .optional()
            .describe('Email address of the contact. This is the default duplicate-check field. Example: "sarah.johnson@example.com"'),
        Phone: z.string().nullable().optional().describe('Work phone number of the contact. Example: "+1 (555) 123-4567"'),
        Mobile: z.string().nullable().optional().describe('Mobile number of the contact. Example: "+1 (555) 987-6543"'),
        Title: z.string().nullable().optional().describe('Job title of the contact. Example: "HR Director"'),
        Department: z.string().nullable().optional().describe('Department the contact belongs to. Example: "Human Resources"'),
        Account_Name: z
            .string()
            .nullable()
            .optional()
            .describe(
                'Company (Accounts module) to link the contact to, supplied as its Bigin record ID. A value that is not an existing company ID is treated as a company name, and Bigin creates a new company with that name. Set to null to unlink the company. Example: "7618134000000632027"'
            ),
        Owner: z.string().nullable().optional().describe('Bigin user ID the contact is assigned to. Example: "2034020000000457001"'),
        Description: z.string().nullable().optional().describe('Free-text notes about the contact. Example: "Met at the annual conference."'),
        Email_Opt_Out: z.boolean().nullable().optional().describe('Whether the contact has opted out of receiving emails. Example: false'),
        Mailing_Street: z.string().nullable().optional().describe('Mailing street address. Example: "456 Elm Avenue"'),
        Mailing_City: z.string().nullable().optional().describe('Mailing city. Example: "Springfield"'),
        Mailing_State: z.string().nullable().optional().describe('Mailing state or province. Example: "Illinois"'),
        Mailing_Zip: z.string().nullable().optional().describe('Mailing ZIP or postal code. Example: "67890"'),
        Mailing_Country: z.string().nullable().optional().describe('Mailing country. Example: "United States"'),
        Tag: z.array(z.string()).optional().describe('Tags to associate with the contact. Example: ["Recruitment", "Priority"]'),
        duplicate_check_fields: z
            .array(z.string())
            .min(1)
            .optional()
            .describe(
                'Field API names used to detect an existing contact and decide insert vs update. Each listed field must be provided with a non-null value. Defaults to ["Email"], the Contacts system-defined unique field.'
            )
    })
    .describe(
        'Contact fields to create or update. The record is matched against an existing contact using duplicate_check_fields (default Email); fields not provided are left unchanged.'
    );

const ProviderResultSchema = z.object({
    code: z.string().optional(),
    action: z.string().optional(),
    duplicate_field: z.string().nullable().optional(),
    details: z
        .object({
            id: z.string().optional(),
            Created_Time: z.string().optional(),
            Modified_Time: z.string().optional(),
            Created_By: z
                .object({
                    name: z.string().optional(),
                    id: z.string().optional()
                })
                .optional(),
            Modified_By: z
                .object({
                    name: z.string().optional(),
                    id: z.string().optional()
                })
                .optional(),
            $approval_state: z.string().optional()
        })
        .optional(),
    message: z.string().optional(),
    status: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderResultSchema).optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Bigin record ID of the inserted or updated contact. Example: "2034020000000644029"'),
        action: z.enum(['insert', 'update']).describe('Whether the call created a new contact ("insert") or matched and updated an existing one ("update").'),
        duplicate_field: z.string().nullable().describe('The duplicate-check field that matched an existing contact, or null when a new contact was inserted.'),
        code: z.string().optional().describe('Provider status code for the record, e.g. "SUCCESS".'),
        message: z.string().optional().describe('Provider result message, e.g. "record added" or "record updated".'),
        status: z.string().optional().describe('Provider result status, e.g. "success".'),
        created_time: z.string().optional().describe('Timestamp when the contact was originally created, in ISO 8601 format.'),
        modified_time: z.string().optional().describe('Timestamp when the contact was last modified, in ISO 8601 format.'),
        created_by: z.string().optional().describe('Name of the user who created the contact.'),
        modified_by: z.string().optional().describe('Name of the user who last modified the contact.'),
        approval_state: z.string().optional().describe('Approval state of the record, e.g. "approved".')
    })
    .describe('Result of the upsert, indicating whether a contact was inserted or updated and the resulting record ID.');

/**
 * @tags: [write]
 * @tagReason: Creates a new contact or updates an existing one through the provider's atomic upsert endpoint.
 * @pitfalls: Last_Name is required when the upsert inserts a new contact; every duplicate-check field (default Email) must be provided, otherwise the call is rejected because Bigin could not match an existing record; when duplicate_check_fields lists only user-defined unique fields, the system-defined Email field is ignored; Account_Name values that are not an existing company ID create a new company with that name.
 */
const action = createAction({
    description:
        'Create a contact, or update it if a record already matches on a chosen duplicate-check field (e.g. Email) - a single atomic call instead of search-then-branch.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.modules.contacts.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const contact = {
            ...(input.Last_Name !== undefined && { Last_Name: input.Last_Name }),
            ...(input.First_Name !== undefined && { First_Name: input.First_Name }),
            ...(input.Email !== undefined && { Email: input.Email }),
            ...(input.Phone !== undefined && { Phone: input.Phone }),
            ...(input.Mobile !== undefined && { Mobile: input.Mobile }),
            ...(input.Title !== undefined && { Title: input.Title }),
            ...(input.Department !== undefined && { Department: input.Department }),
            ...(input.Account_Name !== undefined && { Account_Name: input.Account_Name }),
            ...(input.Owner !== undefined && { Owner: input.Owner }),
            ...(input.Description !== undefined && { Description: input.Description }),
            ...(input.Email_Opt_Out !== undefined && { Email_Opt_Out: input.Email_Opt_Out }),
            ...(input.Mailing_Street !== undefined && { Mailing_Street: input.Mailing_Street }),
            ...(input.Mailing_City !== undefined && { Mailing_City: input.Mailing_City }),
            ...(input.Mailing_State !== undefined && { Mailing_State: input.Mailing_State }),
            ...(input.Mailing_Zip !== undefined && { Mailing_Zip: input.Mailing_Zip }),
            ...(input.Mailing_Country !== undefined && { Mailing_Country: input.Mailing_Country }),
            ...(input.Tag !== undefined && { Tag: input.Tag.map((name) => ({ name })) })
        };

        const duplicateCheckFields = input.duplicate_check_fields ?? ['Email'];
        const contactFields: Record<string, unknown> = contact;
        const missingFields = duplicateCheckFields.filter((field) => contactFields[field] == null || contactFields[field] === '');
        if (missingFields.length > 0) {
            // Without a value for every match field Bigin cannot find the existing contact and always inserts a new one.
            throw new nango.ActionError({
                type: 'invalid_input',
                message: `Provide a value for each duplicate-check field: ${missingFields.join(', ')}.`
            });
        }

        // https://www.bigin.com/developer/docs/apis/v2/upsert-records.html
        const response = await nango.post({
            endpoint: '/bigin/v2/Contacts/upsert',
            data: {
                data: [contact],
                duplicate_check_fields: duplicateCheckFields
            },
            // A retry after a lost response would report the first call's insert as an "update" and fire workflows twice.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const record = parsed.data?.[0];

        if (!record) {
            throw new nango.ActionError({
                type: 'no_result',
                message: 'Bigin returned no result for the upserted contact.'
            });
        }

        if (record.status === 'error' || record.code !== 'SUCCESS') {
            throw new nango.ActionError({
                type: record.code ?? 'upsert_failed',
                message: record.message ?? 'Bigin failed to upsert the contact.'
            });
        }

        const action = record.action;
        if (action !== 'insert' && action !== 'update') {
            throw new nango.ActionError({
                type: 'unexpected_action',
                message: `Bigin returned an unexpected upsert action: ${String(action)}`
            });
        }

        const details = record.details;
        if (!details?.id) {
            throw new nango.ActionError({
                type: 'missing_record_id',
                message: 'Bigin did not return the upserted contact ID.'
            });
        }

        return {
            id: details.id,
            action,
            duplicate_field: record.duplicate_field ?? null,
            ...(record.code !== undefined && { code: record.code }),
            ...(record.message !== undefined && { message: record.message }),
            ...(record.status !== undefined && { status: record.status }),
            ...(details.Created_Time !== undefined && { created_time: details.Created_Time }),
            ...(details.Modified_Time !== undefined && { modified_time: details.Modified_Time }),
            ...(details.Created_By?.name !== undefined && { created_by: details.Created_By.name }),
            ...(details.Modified_By?.name !== undefined && { modified_by: details.Modified_By.name }),
            ...(details.$approval_state !== undefined && { approval_state: details.$approval_state })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
