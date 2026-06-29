import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    account_id: z.string().describe('FreshBooks account ID. Example: "ZyQ04o"')
});

const InputSchema = z.object({
    expenseId: z.number().describe('Expense ID. Example: 123'),
    amount: z.number().optional().describe('Expense amount'),
    date: z.string().optional().describe('Expense date. Example: "2024-01-15"'),
    vendor: z.string().optional().describe('Vendor name'),
    notes: z.string().optional().describe('Expense notes'),
    staffid: z.number().optional().describe('Staff member ID'),
    categoryid: z.number().optional().describe('Expense category ID'),
    clientid: z.number().optional().describe('Client ID'),
    projectid: z.number().optional().describe('Project ID'),
    taxPercent1: z.number().optional().describe('First tax percentage'),
    taxPercent2: z.number().optional().describe('Second tax percentage'),
    status: z.number().optional().describe('Expense status'),
    vis_state: z.number().optional().describe('Visibility state: 0 for active, 1 for deleted')
});

const AmountSchema = z.object({
    amount: z.string(),
    code: z.string()
});

const OutputSchema = z
    .object({
        id: z.number(),
        amount: AmountSchema.nullable().optional(),
        date: z.string().nullable().optional(),
        vendor: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        staffid: z.number().optional(),
        categoryid: z.number().optional(),
        clientid: z.number().optional(),
        projectid: z.number().optional(),
        taxPercent1: z.number().nullable().optional(),
        taxPercent2: z.number().nullable().optional(),
        status: z.number().optional(),
        vis_state: z.number().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Update an expense.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: ['user:expenses:write'],

    exec: async (nango, input) => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'account_id is required in connection metadata.'
            });
        }
        const accountId = metadataResult.data.account_id;

        const expenseBody: Record<string, unknown> = {
            ...(input.amount !== undefined && { amount: input.amount }),
            ...(input.date !== undefined && { date: input.date }),
            ...(input.vendor !== undefined && { vendor: input.vendor }),
            ...(input.notes !== undefined && { notes: input.notes }),
            ...(input.staffid !== undefined && { staffid: input.staffid }),
            ...(input.categoryid !== undefined && { categoryid: input.categoryid }),
            ...(input.clientid !== undefined && { clientid: input.clientid }),
            ...(input.projectid !== undefined && { projectid: input.projectid }),
            ...(input.taxPercent1 !== undefined && { taxPercent1: input.taxPercent1 }),
            ...(input.taxPercent2 !== undefined && { taxPercent2: input.taxPercent2 }),
            ...(input.status !== undefined && { status: input.status }),
            ...(input.vis_state !== undefined && { vis_state: input.vis_state })
        };

        // https://www.freshbooks.com/api
        const response = await nango.put({
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/expenses/expenses/${encodeURIComponent(String(input.expenseId))}`,
            data: {
                expense: expenseBody
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                response: z.object({
                    result: z.object({
                        expense: OutputSchema
                    })
                })
            })
            .safeParse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from FreshBooks API.'
            });
        }

        return providerResponse.data.response.result.expense;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
