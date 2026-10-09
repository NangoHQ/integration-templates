import { z } from 'zod';
import { createAction } from 'nango';

const AccountOwnerSchema = z.object({
    id: z.string().describe('Bigin user ID of the account owner. Example: "2034020000000457001"')
});

const AccountTagSchema = z.object({
    name: z.string().describe('Name of an existing or new tag to attach. Example: "Customer"')
});

const InputSchema = z
    .object({
        Account_Name: z.string().describe('Name of the company to create. Example: "Acme Inc."'),
        Owner: AccountOwnerSchema.optional().describe('User to assign as the owner of the new account.'),
        Phone: z.string().optional().describe('Company phone number. Example: "+1-555-1234567"'),
        Website: z.string().optional().describe('Company website URL. Example: "www.acme.com"'),
        Description: z.string().optional().describe('Additional notes about the company.'),
        Billing_Street: z.string().optional().describe('Billing street address.'),
        Billing_City: z.string().optional().describe('Billing city.'),
        Billing_State: z.string().optional().describe('Billing state or province.'),
        Billing_Country: z.string().optional().describe('Billing country.'),
        Billing_Code: z.string().optional().describe('Billing ZIP or postal code.'),
        Tag: z.array(AccountTagSchema).optional().describe('Tags to attach to the new account.')
    })
    .describe('Fields used to create a Bigin account (company). Only Account_Name is required.');

const ProviderCreateResultSchema = z.object({
    code: z.string(),
    message: z.string(),
    status: z.string(),
    details: z
        .object({
            id: z.string().optional()
        })
        .optional()
});

const ProviderCreateResponseSchema = z.object({
    data: z.array(ProviderCreateResultSchema)
});

const OutputSchema = z
    .object({
        id: z.string().describe('Bigin record ID of the created account. Example: "2034020000000644029"'),
        code: z.string().describe('Provider result code, "SUCCESS" when the account was created.'),
        message: z.string().describe('Provider result message, such as "record added".'),
        status: z.string().describe('Provider result status, such as "success".')
    })
    .describe('Result of creating a Bigin account.');

/**
 * @tags: [write]
 * @tagReason: Creates a new account record in the provider.
 * @pitfalls: Bigin runs duplicate detection against unique fields on insert, so a valid-looking create can be rejected as a duplicate; org-configured workflows also run by default on creation and this action offers no way to suppress them.
 */
const action = createAction({
    description: 'Create a new account (company) in Bigin.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBigin.modules.accounts.ALL'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.bigin.com/developer/docs/apis/v2/insert-records.html
            endpoint: '/bigin/v2/Accounts',
            data: {
                data: [
                    {
                        Account_Name: input.Account_Name,
                        ...(input.Owner !== undefined && { Owner: input.Owner }),
                        ...(input.Phone !== undefined && { Phone: input.Phone }),
                        ...(input.Website !== undefined && { Website: input.Website }),
                        ...(input.Description !== undefined && { Description: input.Description }),
                        ...(input.Billing_Street !== undefined && { Billing_Street: input.Billing_Street }),
                        ...(input.Billing_City !== undefined && { Billing_City: input.Billing_City }),
                        ...(input.Billing_State !== undefined && { Billing_State: input.Billing_State }),
                        ...(input.Billing_Country !== undefined && { Billing_Country: input.Billing_Country }),
                        ...(input.Billing_Code !== undefined && { Billing_Code: input.Billing_Code }),
                        ...(input.Tag !== undefined && { Tag: input.Tag })
                    }
                ]
            },
            // Creating an account is not idempotent, so a retry after a lost response could insert a duplicate.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderCreateResponseSchema.parse(response.data);
        const result = parsed.data[0];

        if (!result || result.status !== 'success' || !result.details?.id) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: result?.message ?? 'Bigin did not return the created account ID.',
                ...(result?.code !== undefined && { code: result.code })
            });
        }

        return {
            id: result.details.id,
            code: result.code,
            message: result.message,
            status: result.status
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
