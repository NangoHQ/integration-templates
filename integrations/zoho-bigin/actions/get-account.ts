import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        record_id: z.string().describe('The unique Bigin record ID of the account to retrieve. Example: "7618134000000632027"')
    })
    .describe('Input for retrieving a single Bigin account (company) by its record ID.');

const OwnerSchema = z.object({
    name: z.string().nullish(),
    id: z.string().nullish(),
    email: z.string().nullish()
});

const TagSchema = z
    .object({
        name: z.string().nullish().describe('Display name of the tag. Example: "Priority"'),
        id: z.string().nullish().describe('Unique record ID of the tag.')
    })
    .passthrough();

const ProviderAccountSchema = z.object({
    id: z.string(),
    Account_Name: z.string().nullish(),
    Phone: z.string().nullish(),
    Website: z.string().nullish(),
    Description: z.string().nullish(),
    Billing_Street: z.string().nullish(),
    Billing_City: z.string().nullish(),
    Billing_State: z.string().nullish(),
    Billing_Code: z.string().nullish(),
    Billing_Country: z.string().nullish(),
    Owner: OwnerSchema.nullish(),
    Created_By: OwnerSchema.nullish(),
    Modified_By: OwnerSchema.nullish(),
    Created_Time: z.string().nullish(),
    Modified_Time: z.string().nullish(),
    Last_Activity_Time: z.string().nullish(),
    Record_Image: z.string().nullish(),
    Tag: z.array(TagSchema).nullish()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderAccountSchema)
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique Bigin record ID of the account. Example: "7618134000000632027"'),
        account_name: z.string().optional().describe('Display name of the company account. Example: "Zylker Corp"'),
        phone: z.string().optional().describe('Primary phone number of the account.'),
        website: z.string().optional().describe('Website URL of the account.'),
        description: z.string().optional().describe('Free-text description of the account.'),
        billing_street: z.string().optional().describe('Street address of the billing address.'),
        billing_city: z.string().optional().describe('City of the billing address.'),
        billing_state: z.string().optional().describe('State or province of the billing address.'),
        billing_code: z.string().optional().describe('Postal or ZIP code of the billing address.'),
        billing_country: z.string().optional().describe('Country of the billing address.'),
        owner_id: z.string().optional().describe('Record ID of the account owner.'),
        owner_name: z.string().optional().describe('Display name of the account owner.'),
        owner_email: z.string().optional().describe('Email address of the account owner.'),
        created_by_id: z.string().optional().describe('Record ID of the user who created the account.'),
        created_by_name: z.string().optional().describe('Display name of the user who created the account.'),
        created_by_email: z.string().optional().describe('Email address of the user who created the account.'),
        modified_by_id: z.string().optional().describe('Record ID of the user who last modified the account.'),
        modified_by_name: z.string().optional().describe('Display name of the user who last modified the account.'),
        modified_by_email: z.string().optional().describe('Email address of the user who last modified the account.'),
        created_time: z.string().optional().describe('ISO 8601 timestamp when the account was created.'),
        modified_time: z.string().optional().describe('ISO 8601 timestamp when the account was last modified.'),
        last_activity_time: z.string().optional().describe('ISO 8601 timestamp of the last activity recorded on the account.'),
        record_image: z.string().optional().describe('URL of the account profile image.'),
        tags: z.array(TagSchema).optional().describe('Tags applied to the account, each with a name and id.')
    })
    .describe('A single Bigin account (company) record with its native fields normalized to snake_case.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single account record from the provider without creating, changing, or deleting any provider data.
 * @pitfalls: A non-existent or deleted account is reported as a not_found error rather than returning empty data; provider fields that are empty are omitted from the output instead of being returned as null.
 */
const action = createAction({
    description: 'Retrieve a single account (company) by its record ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.modules.accounts.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.bigin.com/developer/docs/apis/v2/get-records.html
        const response = await nango.get<unknown>({
            endpoint: `/bigin/v2/Accounts/${encodeURIComponent(input.record_id)}`,
            params: {
                fields: 'Owner,Account_Name,Phone,Website,Created_By,Modified_By,Created_Time,Modified_Time,Billing_Street,Billing_City,Billing_State,Billing_Code,Billing_Country,Description,Last_Activity_Time,Tag,Record_Image,id'
            },
            retries: 3
        });

        if (response.status === 204 || !response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Account with ID "${input.record_id}" was not found`,
                record_id: input.record_id
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse Bigin account response',
                details: parsed.error.message
            });
        }

        const account = parsed.data.data[0];
        if (account === undefined) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Account with ID "${input.record_id}" was not found`,
                record_id: input.record_id
            });
        }

        return {
            id: account.id,
            ...(account.Account_Name != null && { account_name: account.Account_Name }),
            ...(account.Phone != null && { phone: account.Phone }),
            ...(account.Website != null && { website: account.Website }),
            ...(account.Description != null && { description: account.Description }),
            ...(account.Billing_Street != null && { billing_street: account.Billing_Street }),
            ...(account.Billing_City != null && { billing_city: account.Billing_City }),
            ...(account.Billing_State != null && { billing_state: account.Billing_State }),
            ...(account.Billing_Code != null && { billing_code: account.Billing_Code }),
            ...(account.Billing_Country != null && { billing_country: account.Billing_Country }),
            ...(account.Owner?.id != null && { owner_id: account.Owner.id }),
            ...(account.Owner?.name != null && { owner_name: account.Owner.name }),
            ...(account.Owner?.email != null && { owner_email: account.Owner.email }),
            ...(account.Created_By?.id != null && { created_by_id: account.Created_By.id }),
            ...(account.Created_By?.name != null && { created_by_name: account.Created_By.name }),
            ...(account.Created_By?.email != null && { created_by_email: account.Created_By.email }),
            ...(account.Modified_By?.id != null && { modified_by_id: account.Modified_By.id }),
            ...(account.Modified_By?.name != null && { modified_by_name: account.Modified_By.name }),
            ...(account.Modified_By?.email != null && { modified_by_email: account.Modified_By.email }),
            ...(account.Created_Time != null && { created_time: account.Created_Time }),
            ...(account.Modified_Time != null && { modified_time: account.Modified_Time }),
            ...(account.Last_Activity_Time != null && { last_activity_time: account.Last_Activity_Time }),
            ...(account.Record_Image != null && { record_image: account.Record_Image }),
            ...(account.Tag != null && { tags: account.Tag })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
