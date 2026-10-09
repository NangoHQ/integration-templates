import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        record_id: z.string().describe('Unique ID of the contact to update. Example: "7618134000000648015"'),
        First_Name: z.string().optional().describe('First name of the contact.'),
        Last_Name: z.string().optional().describe('Last name of the contact.'),
        Email: z.string().optional().describe('Email address of the contact.'),
        Title: z.string().optional().describe('Job title of the contact.'),
        Phone: z.string().optional().describe('Primary phone number of the contact.'),
        Home_Phone: z.string().optional().describe('Home phone number of the contact.'),
        Mobile: z.string().optional().describe('Mobile phone number of the contact.'),
        Mailing_Street: z.string().optional().describe('Street address of the contact.'),
        Mailing_City: z.string().optional().describe('City of the contact address.'),
        Mailing_State: z.string().optional().describe('State of the contact address.'),
        Mailing_Zip: z.string().optional().describe('ZIP or postal code of the contact address.'),
        Mailing_Country: z.string().optional().describe('Country of the contact address.'),
        Description: z.string().optional().describe('Description or notes about the contact.'),
        Email_Opt_Out: z.boolean().optional().describe('Whether the contact has opted out of receiving emails.'),
        Account_Name: z.string().optional().describe('Bigin record ID of the company (Accounts record) to link the contact to. Example: "7618134000000632027"')
    })
    .describe('Contact fields to update; only the fields you provide are changed.');

const ProviderUpdateResultSchema = z.object({
    code: z.string().optional(),
    message: z.string().optional(),
    status: z.string().optional(),
    details: z
        .object({
            id: z.string().optional(),
            Modified_Time: z.string().optional(),
            Modified_By: z
                .object({
                    id: z.string().optional(),
                    name: z.string().optional()
                })
                .optional()
        })
        .optional()
});

const ApiResponseSchema = z.object({
    data: z.array(ProviderUpdateResultSchema).optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique ID of the updated contact. Example: "7618134000000648015"'),
        message: z.string().describe('Provider message confirming the update. Example: "record updated"'),
        status: z.string().optional().describe('Provider status for the update. Example: "success"'),
        modified_time: z.string().optional().describe('Timestamp when the contact was last modified, in ISO 8601 format.'),
        modified_by: z
            .object({
                id: z.string().optional().describe('User ID of the person who modified the contact.'),
                name: z.string().optional().describe('Name of the person who modified the contact.')
            })
            .optional()
            .describe('User who performed the update.')
    })
    .describe('Result of updating a Bigin contact.');

/**
 * @tags: [write]
 * @tagReason: Writes updated field values to an existing provider contact record.
 * @pitfalls: Only the fields you provide are changed; omitted fields keep their current values. Linking a company (Account_Name) requires the company's record ID, not its name. Updating a nonexistent or malformed contact ID fails with an error rather than an empty result.
 */
const action = createAction({
    description: 'Update fields on an existing Bigin contact. Only the fields you provide are changed.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.modules.contacts.UPDATE', 'ZohoBigin.modules.contacts.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const { record_id, Account_Name, ...contactFields } = input;

        const data: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(contactFields)) {
            if (value !== undefined) {
                data[key] = value;
            }
        }

        if (Account_Name !== undefined) {
            data['Account_Name'] = { id: Account_Name };
        }

        // https://www.bigin.com/developer/docs/apis/v2/update-records.html
        const response = await nango.put({
            endpoint: `/bigin/v2/Contacts/${encodeURIComponent(record_id)}`,
            data: {
                data: [{ id: record_id, ...data }]
            },
            retries: 3
        });

        const parsedResponse = ApiResponseSchema.safeParse(response.data);

        if (!parsedResponse.success || !parsedResponse.data.data || parsedResponse.data.data.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response while updating the contact.',
                record_id
            });
        }

        const result = parsedResponse.data.data[0];

        if (result === undefined) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing update result while updating the contact.',
                record_id
            });
        }

        if (result.status !== undefined && result.status !== 'success') {
            throw new nango.ActionError({
                type: 'update_failed',
                message: result.message ?? 'Failed to update the contact.',
                record_id
            });
        }

        const details = result.details;

        return {
            id: details?.id ?? record_id,
            message: result.message ?? 'record updated',
            ...(result.status !== undefined && { status: result.status }),
            ...(details?.Modified_Time !== undefined && { modified_time: details.Modified_Time }),
            ...(details?.Modified_By !== undefined && {
                modified_by: {
                    ...(details.Modified_By.id !== undefined && { id: details.Modified_By.id }),
                    ...(details.Modified_By.name !== undefined && { name: details.Modified_By.name })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
