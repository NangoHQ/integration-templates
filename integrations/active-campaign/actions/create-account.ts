import { z } from 'zod';
import { createAction } from 'nango';

const AccountCustomFieldSchema = z.object({
    customFieldId: z.number().describe('Field ID of the Custom Field Meta Data. Example: 9'),
    fieldValue: z.union([z.string(), z.number()]).describe('Updated field value. For currency fields, this needs to be in cents.'),
    fieldCurrency: z.string().optional().describe('Three-letter currency code for currency field types. Example: GBP')
});

const InputSchema = z.object({
    name: z.string().describe('Account name. Example: "Example Account"'),
    accountUrl: z.string().optional().describe('Account website URL. Example: "https://www.example.com"'),
    owner: z.number().optional().describe('User ID of the account owner. Example: 1'),
    fields: z.array(AccountCustomFieldSchema).optional().describe('Account custom field values.')
});

const AccountFieldSchema = z.object({
    customFieldId: z.number(),
    fieldValue: z.union([z.string(), z.number()]),
    accountId: z.string().optional(),
    fieldCurrency: z.string().optional()
});

const ProviderAccountSchema = z.object({
    id: z.string(),
    name: z.string(),
    accountUrl: z.string().nullable().optional(),
    createdTimestamp: z.string().optional(),
    updatedTimestamp: z.string().optional(),
    fields: z.array(AccountFieldSchema).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    accountUrl: z.string().optional(),
    createdTimestamp: z.string().optional(),
    updatedTimestamp: z.string().optional(),
    fields: z.array(AccountFieldSchema).optional()
});

const action = createAction({
    description: 'Create an account in ActiveCampaign.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        const requestBody: {
            account: {
                name: string;
                accountUrl?: string;
                owner?: number;
                fields?: Array<{
                    customFieldId: number;
                    fieldValue: string | number;
                    fieldCurrency?: string;
                }>;
            };
        } = {
            account: {
                name: input.name,
                ...(input.accountUrl !== undefined && { accountUrl: input.accountUrl }),
                ...(input.owner !== undefined && { owner: input.owner }),
                ...(input.fields !== undefined && {
                    fields: input.fields.map((field) => ({
                        customFieldId: field.customFieldId,
                        fieldValue: field.fieldValue,
                        ...(field.fieldCurrency !== undefined && { fieldCurrency: field.fieldCurrency })
                    }))
                })
            }
        };

        // https://developers.activecampaign.com/reference/create-an-account-new
        const response = await nango.post({
            endpoint: '/3/accounts',
            data: requestBody,
            retries: 3
        });

        const rawAccount = z
            .object({
                account: z.unknown()
            })
            .parse(response.data);

        const providerAccount = ProviderAccountSchema.parse(rawAccount.account);

        return {
            id: providerAccount.id,
            name: providerAccount.name,
            ...(providerAccount.accountUrl != null && { accountUrl: providerAccount.accountUrl }),
            ...(providerAccount.createdTimestamp !== undefined && { createdTimestamp: providerAccount.createdTimestamp }),
            ...(providerAccount.updatedTimestamp !== undefined && { updatedTimestamp: providerAccount.updatedTimestamp }),
            ...(providerAccount.fields !== undefined && { fields: providerAccount.fields })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
