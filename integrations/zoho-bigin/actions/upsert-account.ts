import { z } from 'zod';
import { createAction } from 'nango';

const AccountFieldsSchema = z
    .object({
        Account_Name: z
            .string()
            .describe('Name of the account (company). Required by Bigin and used as the default duplicate-check field. Example: "Acme Inc."'),
        Phone: z.string().nullable().optional().describe('Primary phone number of the account. Set to null to clear it.'),
        Website: z.string().nullable().optional().describe('Website URL of the account. Set to null to clear it. Example: "https://acme.com"'),
        Email: z.string().nullable().optional().describe('Email address associated with the account. Set to null to clear it.'),
        Industry: z.string().nullable().optional().describe('Industry the account belongs to. Set to null to clear it. Example: "Technology"'),
        Description: z.string().nullable().optional().describe('Free-text description of the account. Set to null to clear it.'),
        Billing_Street: z.string().nullable().optional().describe('Billing street address. Set to null to clear it.'),
        Billing_City: z.string().nullable().optional().describe('Billing city. Set to null to clear it.'),
        Billing_State: z.string().nullable().optional().describe('Billing state or province. Set to null to clear it.'),
        Billing_Code: z.string().nullable().optional().describe('Billing postal or ZIP code. Set to null to clear it.'),
        Billing_Country: z.string().nullable().optional().describe('Billing country. Set to null to clear it.')
    })
    .passthrough();

const InputSchema = z
    .object({
        account: AccountFieldsSchema.describe(
            'Account record to insert or update. Must contain the fields listed in duplicate_check_fields (Account_Name by default).'
        ),
        duplicate_check_fields: z
            .array(z.string())
            .min(1)
            .optional()
            .describe(
                'Field API names used to find an existing account before inserting. Each listed field must be present in account with a non-empty value. Defaults to ["Account_Name"]. Example: ["Account_Name"]'
            )
    })
    .describe('Account fields to upsert plus the duplicate-check fields used to detect an existing account.');

const ProviderDetailsSchema = z.object({
    id: z.string().optional(),
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
 * @pitfalls: duplicate_check_fields must reference fields configured as unique in the org and present in account; a non-unique field can create duplicate accounts instead of updating, and when duplicate_check_fields is omitted this action sends ["Account_Name"], so user-defined unique fields are only checked when listed explicitly.
 */
const action = createAction({
    description: 'Create an account, or update it if a record already matches on a chosen duplicate-check field (e.g. Account_Name) - atomic find-or-create.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.modules.accounts.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const duplicateCheckFields = input.duplicate_check_fields ?? ['Account_Name'];
        const accountFields: Record<string, unknown> = input.account;
        const missingFields = duplicateCheckFields.filter((field) => accountFields[field] == null || accountFields[field] === '');
        if (missingFields.length > 0) {
            // Without a value for every match field Bigin cannot find the existing account and always inserts a new one.
            throw new nango.ActionError({
                type: 'invalid_input',
                message: `account must include a value for each duplicate-check field: ${missingFields.join(', ')}.`
            });
        }

        const response = await nango.post({
            // https://www.bigin.com/developer/docs/apis/v2/upsert-records.html
            endpoint: '/bigin/v2/Accounts/upsert',
            data: {
                data: [input.account],
                duplicate_check_fields: duplicateCheckFields
            },
            // A retry after a lost response would report the first call's insert as an "update" and fire workflows twice.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const result = parsed.data[0];

        if (!result || result.status !== 'success' || (result.action !== 'insert' && result.action !== 'update') || !result.details?.id) {
            throw new nango.ActionError({
                type: 'upsert_failed',
                // A success result without an id or action must not surface its success message as the error.
                message:
                    result?.status === 'success' ? 'Bigin did not return the upserted account ID and action.' : (result?.message ?? 'Account upsert failed'),
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
