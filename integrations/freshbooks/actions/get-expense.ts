import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Expense ID. Example: "2420475"')
});

const AmountSchema = z.object({
    amount: z.string(),
    code: z.string()
});

const ProviderExpenseSchema = z
    .object({
        id: z.number(),
        expenseid: z.number(),
        amount: AmountSchema.nullable().optional(),
        date: z.string().optional(),
        notes: z.string().nullable().optional(),
        staffid: z.number().optional(),
        categoryid: z.number().optional(),
        clientid: z.number().optional(),
        vis_state: z.number().optional(),
        status: z.number().optional(),
        updated: z.string().optional(),
        vendor: z.string().nullable().optional(),
        projectid: z.number().optional(),
        billable: z.boolean().optional(),
        is_cogs: z.boolean().optional(),
        isduplicate: z.boolean().optional(),
        transactionid: z.number().nullable().optional(),
        invoiceid: z.number().nullable().optional(),
        ext_invoiceid: z.number().optional(),
        ext_systemid: z.number().optional(),
        modern_projectid: z.number().nullable().optional(),
        converse_projectid: z.number().nullable().optional(),
        background_jobid: z.number().nullable().optional(),
        ext_accountid: z.number().nullable().optional(),
        profileid: z.number().nullable().optional(),
        accountid: z.number().nullable().optional(),
        accounting_systemid: z.string().optional(),
        taxAmount1: z.string().nullable().optional(),
        taxAmount2: z.string().nullable().optional(),
        taxName1: z.string().nullable().optional(),
        taxName2: z.string().nullable().optional(),
        taxPercent1: z.string().nullable().optional(),
        taxPercent2: z.string().nullable().optional(),
        markup_percent: z.string().optional(),
        version: z.string().optional(),
        from_bulk_import: z.boolean().optional(),
        has_receipt: z.boolean().optional(),
        include_receipt: z.boolean().optional(),
        potential_bill_payment: z.boolean().optional(),
        compounded_tax: z.boolean().optional(),
        bank_name: z.string().optional(),
        account_name: z.string().optional(),
        bill_matches: z.array(z.unknown()).optional()
    })
    .passthrough();

const OutputSchema = ProviderExpenseSchema;

const MetadataSchema = z.object({
    accountId: z.string().describe('FreshBooks account ID. Example: "ZyQ04o"')
});

const action = createAction({
    description: 'Retrieve a single expense.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['user:expenses:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(metadata);
        const accountId = metadataResult.data?.accountId;

        if (!accountId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'accountId is required in connection metadata.'
            });
        }

        const response = await nango.get({
            // https://www.freshbooks.com/api
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/expenses/expenses/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const wrapperSchema = z.object({
            response: z.object({
                result: z.object({
                    expense: z.unknown().optional()
                })
            })
        });

        const wrapper = wrapperSchema.parse(response.data);
        const rawExpense = wrapper.response.result.expense;

        if (rawExpense === undefined) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Expense not found.',
                id: input.id
            });
        }

        const providerExpense = ProviderExpenseSchema.parse(rawExpense);

        return providerExpense;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
