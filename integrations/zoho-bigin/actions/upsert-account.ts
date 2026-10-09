import { z } from 'zod';
import { createAction } from 'nango';

const AccountFieldsSchema = z
    .object({
        Account_Name: z
            .string()
            .describe('Name of the account (company). Required by Bigin and used as the default duplicate-check field. Example: "Acme Inc."'),
        Phone: z.string().optional().describe('Primary phone number of the account.'),
        Website: z.string().optional().describe('Website URL of the account. Example: "https://acme.com"'),
        Email: z.string().optional().describe('Email address associated with the account.'),
        Industry: z.string().optional().describe('Industry the account belongs to. Example: "Technology"'),
        Description: z.string().optional().describe('Free-text description of the account.'),
        Billing_Street: z.string().optional().describe('Billing street address.'),
        Billing_City: z.string().optional().describe('Billing city.'),
        Billing_State: z.string().optional().describe('Billing state or province.'),
        Billing_Code: z.string().optional().describe('Billing postal or ZIP code.'),
        Billing_Country: z.string().optional().describe('Billing country.')
    })
    .passthrough();

const InputSchema = z
    .object({
        account: AccountFieldsSchema.describe(
            'Account record to insert or update. Must contain the fields listed in duplicate_check_fields (Account_Name by default).'
        ),
        duplicate_check_fields: z
            .array(z.string())
            .optional()
            .describe('Field API names used to find an existing account before inserting. Defaults to ["Account_Name"]. Example: ["Account_Name"]')
    })
    .describe('Account fields to upsert plus the duplicate-check fields used to detect an existing account.');

const ProviderDetailsSchema = z.object({
    id: z.string(),
    Created_Time: z.string().optional(),
    Modified_Time: z.string().optional()
});

const ProviderResultSchema = z.object({
    code: z.string().optional(),
    duplicate_field: z.string().nullable().optional(),
    action: z.string().optional(),
    details: ProviderDetailsSchema.optional(),
    message: z.string().optional(),
    status: z.string().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderResultSchema)
});

const OutputSchema = z
    .object({
        id: z.string().describe('Bigin record ID of the created or updated account.'),
        action: z.enum(['insert', 'update']).describe('Whether a new account was inserted or an existing account was updated.'),
        duplicate_field: z.string().optional().describe('Duplicate-check field that matched an existing account; omitted for inserts.'),
        created_time: z.string().optional().describe('ISO 8601 timestamp when the account was originally created.'),
        modified_time: z.string().optional().describe('ISO 8601 timestamp when the account was last modified.'),
        message: z.string().optional().describe('Provider status message, such as "record added" or "record updated".')
    })
    .describe('Result of the atomic account upsert, including whether the record was inserted or updated.');

/**
 * @tags: [write]
 * @tagReason: Creates or updates an account through the provider's atomic upsert endpoint.
 * @pitfalls: duplicate_check_fields must reference fields configured as unique in the org; a non-unique field can create duplicate accounts instead of updating, and when duplicate_check_fields is omitted the provider checks Account_Name first, then any user-defined unique fields.
 */
const action = createAction({
    description: 'Create an account, or update it if a record already matches on a chosen duplicate-check field (e.g. Account_Name) - atomic find-or-create.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.modules.accounts.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const duplicateCheckFields = input.duplicate_check_fields ?? ['Account_Name'];

        const response = await nango.post({
            // https://www.bigin.com/developer/docs/apis/v2/upsert-records.html
            endpoint: '/bigin/v2/Accounts/upsert',
            data: {
                data: [input.account],
                duplicate_check_fields: duplicateCheckFields
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const result = parsed.data[0];

        if (!result || result.status !== 'success' || (result.action !== 'insert' && result.action !== 'update') || !result.details) {
            throw new nango.ActionError({
                type: 'upsert_failed',
                message: result?.message ?? 'Account upsert failed',
                code: result?.code
            });
        }

        return {
            id: result.details.id,
            action: result.action,
            ...(result.duplicate_field != null && { duplicate_field: result.duplicate_field }),
            ...(result.details.Created_Time != null && { created_time: result.details.Created_Time }),
            ...(result.details.Modified_Time != null && { modified_time: result.details.Modified_Time }),
            ...(result.message != null && { message: result.message })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
