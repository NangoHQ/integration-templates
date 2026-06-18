import { z } from 'zod';
import { createAction } from 'nango';

const AccountCustomFieldSchema = z.object({
    customFieldId: z.number(),
    fieldValue: z.string(),
    fieldCurrency: z.string().optional()
});

const InputSchema = z.object({
    id: z.string().describe('Account ID. Example: "1"'),
    name: z.string().optional().describe('Account name'),
    accountUrl: z.string().optional().describe('Account website URL'),
    owner: z.number().optional().describe('User ID of the account owner'),
    fields: z.array(AccountCustomFieldSchema).optional().describe('Custom field values')
});

const ProviderAccountSchema = z.object({
    id: z.string(),
    name: z.string().nullable(),
    accountUrl: z.string().nullable(),
    createdTimestamp: z.string().optional(),
    updatedTimestamp: z.string().optional(),
    links: z.unknown().optional(),
    fields: z
        .array(
            z.object({
                customFieldId: z.number(),
                fieldValue: z.union([z.string(), z.number()]).nullable(),
                fieldCurrency: z.string().optional(),
                accountId: z.string().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    accountUrl: z.string().optional(),
    createdTimestamp: z.string().optional(),
    updatedTimestamp: z.string().optional(),
    links: z.unknown().optional(),
    fields: z
        .array(
            z.object({
                customFieldId: z.number(),
                fieldValue: z.union([z.string(), z.number()]).optional(),
                fieldCurrency: z.string().optional(),
                accountId: z.string().optional()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Update an account in ActiveCampaign',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {
            account: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.accountUrl !== undefined && { accountUrl: input.accountUrl }),
                ...(input.owner !== undefined && { owner: input.owner }),
                ...(input.fields !== undefined && { fields: input.fields })
            }
        };

        // https://developers.activecampaign.com/reference/update-an-account-new
        const response = await nango.patch({
            endpoint: `/3/accounts/${encodeURIComponent(input.id)}`,
            data,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Account not found or update failed',
                id: input.id
            });
        }

        const providerResponse = z
            .object({
                account: ProviderAccountSchema
            })
            .parse(response.data);

        const account = providerResponse.account;

        return {
            id: account.id,
            ...(account.name != null && { name: account.name }),
            ...(account.accountUrl != null && { accountUrl: account.accountUrl }),
            ...(account.createdTimestamp !== undefined && { createdTimestamp: account.createdTimestamp }),
            ...(account.updatedTimestamp !== undefined && { updatedTimestamp: account.updatedTimestamp }),
            ...(account.links !== undefined && { links: account.links }),
            ...(account.fields !== undefined && {
                fields: account.fields.map((field) => ({
                    customFieldId: field.customFieldId,
                    ...(field.fieldValue != null && { fieldValue: field.fieldValue }),
                    ...(field.fieldCurrency !== undefined && { fieldCurrency: field.fieldCurrency }),
                    ...(field.accountId !== undefined && { accountId: field.accountId })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
