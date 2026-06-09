import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    expense_id: z.string().describe('Unique identifier of the expense. Example: "260815000000106001"')
});

const LineItemTaxSchema = z
    .object({
        tax_name: z.string().optional(),
        tax_amount: z.number().optional(),
        tax_id: z.string().optional(),
        tax_percentage: z.number().optional(),
        tax_type: z.string().optional()
    })
    .passthrough();

const LineItemSchema = z
    .object({
        line_item_id: z.string().optional(),
        account_id: z.string().optional(),
        account_name: z.string().optional(),
        description: z.string().optional(),
        tax_amount: z.number().optional(),
        tax_id: z.string().optional(),
        tax_name: z.string().optional(),
        tax_type: z.string().optional(),
        tax_percentage: z.number().optional(),
        item_total: z.number().optional(),
        amount: z.number().optional(),
        item_order: z.number().optional(),
        line_item_taxes: z.array(LineItemTaxSchema).optional(),
        tags: z.array(z.unknown()).optional()
    })
    .passthrough();

const ExpenseSchema = z
    .object({
        expense_id: z.string(),
        date: z.string().optional(),
        account_id: z.string().optional(),
        account_name: z.string().optional(),
        paid_through_account_id: z.string().optional(),
        paid_through_account_name: z.string().optional(),
        currency_id: z.string().optional(),
        currency_code: z.string().optional(),
        currency_symbol: z.string().optional(),
        amount: z.number().optional(),
        status: z.string().optional(),
        vendor_id: z.string().optional(),
        vendor_name: z.string().optional(),
        description: z.string().optional(),
        reference_number: z.string().optional(),
        is_billable: z.boolean().optional(),
        customer_id: z.string().optional(),
        customer_name: z.string().optional(),
        project_id: z.string().optional(),
        project_name: z.string().optional(),
        receipt_name: z.string().optional(),
        mileage_type: z.string().optional(),
        mileage_rate: z.number().optional(),
        distance: z.number().optional(),
        mileage_unit: z.string().optional(),
        expense_receipt_type: z.string().optional(),
        start_reading: z.string().optional(),
        end_reading: z.string().optional(),
        vehicle_type: z.string().optional(),
        vehicle_name: z.string().optional(),
        vehicle_id: z.string().optional(),
        recurring_expense_id: z.string().optional(),
        created_time: z.string().optional(),
        last_modified_time: z.string().optional(),
        tags: z.array(z.unknown()).optional(),
        line_items: z.array(LineItemSchema).optional(),
        transaction_type: z.string().optional(),
        transaction_type_formatted: z.string().optional(),
        expense_item_id: z.string().optional(),
        documents: z.array(z.unknown()).optional(),
        markup_percent: z.number().optional(),
        tax_id: z.string().optional(),
        tax_name: z.string().optional(),
        tax_percentage: z.number().optional(),
        taxes: z.array(z.unknown()).optional(),
        tax_override_preference: z.string().optional(),
        exchange_rate: z.number().optional(),
        tax_amount: z.number().optional(),
        sub_total: z.number().optional(),
        total: z.number().optional(),
        bcy_total: z.number().optional(),
        is_inclusive_tax: z.boolean().optional(),
        is_personal: z.boolean().optional(),
        expense_receipt_name: z.string().optional(),
        created_by_id: z.string().optional(),
        last_modified_by_id: z.string().optional(),
        employee_id: z.string().optional(),
        employee_name: z.string().optional(),
        employee_email: z.string().optional(),
        expense_type: z.string().optional(),
        invoice_id: z.string().optional(),
        invoice_number: z.string().optional(),
        report_id: z.string().optional(),
        report_name: z.string().optional(),
        report_number: z.string().optional(),
        user_id: z.string().optional(),
        user_name: z.string().optional(),
        user_email: z.string().optional(),
        approver_id: z.string().optional(),
        approver_name: z.string().optional(),
        approver_email: z.string().optional(),
        report_status: z.string().optional(),
        is_reimbursable: z.boolean().optional(),
        trip_id: z.string().optional(),
        trip_number: z.string().optional(),
        location: z.string().optional(),
        merchant_id: z.string().optional(),
        merchant_name: z.string().optional(),
        payment_mode: z.string().optional(),
        template_id: z.string().optional(),
        template_name: z.string().optional(),
        template_type: z.string().optional(),
        page_width: z.string().optional(),
        page_height: z.string().optional(),
        orientation: z.string().optional(),
        custom_fields: z.array(z.unknown()).optional(),
        custom_field_hash: z.record(z.string(), z.unknown()).optional(),
        is_recurring_applicable: z.boolean().optional(),
        is_surcharge_applicable: z.boolean().optional(),
        fcy_surcharge_amount: z.number().optional(),
        bcy_surcharge_amount: z.number().optional(),
        zcrm_potential_id: z.string().optional(),
        zcrm_potential_name: z.string().optional(),
        imported_transactions: z.array(z.unknown()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    expense: ExpenseSchema
});

const action = createAction({
    description: 'Retrieve a single expense from Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-expense',
        group: 'Expenses'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/books/api/v3/expenses/#get-an-expense
        const response = await nango.get({
            endpoint: `/books/v3/expenses/${encodeURIComponent(input.expense_id)}`,
            params: {
                organization_id: '927270289'
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Expense not found',
                expense_id: input.expense_id
            });
        }

        const data = response.data;
        const expenseObj = 'expense' in data ? data.expense : undefined;

        if (!expenseObj || typeof expenseObj !== 'object' || expenseObj === null) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Expense not found',
                expense_id: input.expense_id
            });
        }

        const expense = ExpenseSchema.parse(expenseObj);

        return {
            expense
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
