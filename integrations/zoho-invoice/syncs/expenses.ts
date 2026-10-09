import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderExpenseSchema = z.object({
    expense_id: z.string(),
    date: z.string().nullable().optional(),
    user_name: z.string().nullable().optional(),
    account_name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    currency_id: z.string().nullable().optional(),
    currency_code: z.string().nullable().optional(),
    bcy_total: z.number().nullable().optional(),
    bcy_total_without_tax: z.number().nullable().optional(),
    total: z.number().nullable().optional(),
    total_without_tax: z.number().nullable().optional(),
    is_billable: z.boolean().nullable().optional(),
    reference_number: z.string().nullable().optional(),
    customer_id: z.string().nullable().optional(),
    customer_name: z.string().nullable().optional(),
    is_personal: z.boolean().nullable().optional(),
    status: z.string().nullable().optional(),
    created_time: z.string().nullable().optional(),
    last_modified_time: z.string().nullable().optional(),
    expense_receipt_name: z.string().nullable().optional(),
    exchange_rate: z.number().nullable().optional(),
    distance: z.number().nullable().optional(),
    mileage_rate: z.number().nullable().optional(),
    mileage_unit: z.string().nullable().optional(),
    mileage_type: z.string().nullable().optional(),
    expense_type: z.string().nullable().optional(),
    report_id: z.string().nullable().optional(),
    report_name: z.string().nullable().optional(),
    report_number: z.string().nullable().optional(),
    has_attachment: z.boolean().nullable().optional(),
    start_reading: z.union([z.string(), z.number()]).nullable().optional(),
    end_reading: z.union([z.string(), z.number()]).nullable().optional()
});

const ExpensesPageSchema = z.object({
    expenses: z.array(ProviderExpenseSchema),
    page_context: z.object({
        page: z.number(),
        per_page: z.number(),
        has_more_page: z.boolean()
    })
});

const ExpenseSchema = z
    .object({
        id: z.string().describe('Unique identifier of the expense; equal to expense_id.'),
        expense_id: z.string().describe('Zoho Invoice ID of the expense.'),
        date: z.string().optional().describe('Date the expense was recorded, in yyyy-mm-dd format.'),
        user_name: z.string().optional().describe('Name of the user who recorded the expense.'),
        account_name: z
            .string()
            .optional()
            .describe('Name of the expense account (category) the expense is recorded under. The account ID is not returned by the list endpoint.'),
        description: z.string().optional().describe('Description of the expense.'),
        currency_id: z.string().optional().describe('ID of the currency the expense is recorded in.'),
        currency_code: z.string().optional().describe('ISO currency code of the expense (for example USD).'),
        bcy_total: z.number().optional().describe('Total expense amount in the organization base currency.'),
        bcy_total_without_tax: z.number().optional().describe('Total expense amount excluding tax, in the organization base currency.'),
        total: z.number().optional().describe('Total expense amount in the expense currency, including tax.'),
        total_without_tax: z.number().optional().describe('Total expense amount in the expense currency, excluding tax.'),
        is_billable: z.boolean().optional().describe('Whether the expense is billable to a customer.'),
        reference_number: z.string().optional().describe('Reference number of the expense.'),
        customer_id: z.string().optional().describe('ID of the customer the expense is associated with, if any.'),
        customer_name: z.string().optional().describe('Name of the customer the expense is associated with, if any.'),
        is_personal: z.boolean().optional().describe('Whether the expense is marked as personal.'),
        status: z.string().optional().describe('Expense status (for example unbilled, invoiced, reimbursed, billable or nonbillable).'),
        created_time: z.string().optional().describe('Timestamp when the expense was created, in the organization timezone.'),
        last_modified_time: z.string().optional().describe('Timestamp when the expense was last modified; used as the incremental sync cursor.'),
        expense_receipt_name: z.string().optional().describe('Name of the receipt attached to the expense, if any.'),
        exchange_rate: z.number().optional().describe('Exchange rate used to convert the expense currency to the organization base currency.'),
        distance: z.number().optional().describe('Distance travelled for mileage expenses.'),
        mileage_rate: z.number().optional().describe('Mileage rate applied for mileage expenses.'),
        mileage_unit: z.string().optional().describe('Unit of distance for mileage expenses (for example km or mile).'),
        mileage_type: z.string().optional().describe('Mileage expense type (for example non_mileage, odometer or manual).'),
        expense_type: z.string().optional().describe('Type of the expense (for example non-mileage).'),
        report_id: z.string().optional().describe('ID of the expense report the expense belongs to, if any.'),
        report_name: z.string().optional().describe('Name of the expense report the expense belongs to, if any.'),
        report_number: z.string().optional().describe('Number of the expense report the expense belongs to, if any.'),
        has_attachment: z.boolean().optional().describe('Whether the expense has an attached receipt.'),
        start_reading: z
            .union([z.string(), z.number()])
            .optional()
            .describe('Odometer start reading for odometer mileage expenses, as returned by the provider.'),
        end_reading: z.union([z.string(), z.number()]).optional().describe('Odometer end reading for odometer mileage expenses, as returned by the provider.')
    })
    .describe('An expense recorded in Zoho Invoice.');

const MetadataSchema = z
    .object({
        organization_id: z.string().describe('Zoho Invoice organization ID used to scope every expense API request.')
    })
    .describe('Connection metadata identifying the Zoho Invoice organization to sync.');

const CheckpointSchema = z.object({
    updated_after: z
        .string()
        .describe('Last modification timestamp (ISO-8601) already synced; sent as the last_modified_time filter. Empty string means no filter.'),
    page: z.number().int().positive().describe('Next page number to fetch when resuming a partially completed scan.')
});

type Checkpoint = {
    updated_after?: string;
    page?: number;
};

function parseCheckpoint(value: unknown): Checkpoint {
    const result = CheckpointSchema.safeParse(value);
    if (!result.success) {
        return {};
    }

    const checkpoint: Checkpoint = {};
    if (result.data.updated_after !== '') {
        checkpoint.updated_after = result.data.updated_after;
    }
    checkpoint.page = result.data.page;
    return checkpoint;
}

function toTimestamp(value: string | null | undefined): number | undefined {
    if (value == null) {
        return undefined;
    }

    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : parsed;
}

const sync = createSync({
    description: 'Sync expenses from Zoho Invoice incrementally by last modified time.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Expense: ExpenseSchema
    },

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(rawMetadata);
        if (!parsedMetadata.success) {
            throw new Error('organization_id is required in connection metadata');
        }
        const organizationId = parsedMetadata.data.organization_id;

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = parseCheckpoint(rawCheckpoint);
        let updatedAfter: string | undefined = checkpoint.updated_after;
        let page: number = checkpoint.page ?? 1;

        let hasMorePages = true;
        let latestModifiedTime: string | undefined;
        let latestModifiedTimestamp: number | undefined;

        while (hasMorePages) {
            const proxyConfig: ProxyConfiguration = {
                // https://www.zoho.com/invoice/api/v3/expenses/#list-expenses
                endpoint: '/invoice/v3/expenses',
                params: {
                    organization_id: organizationId,
                    page,
                    per_page: 200,
                    ...(updatedAfter !== undefined && { last_modified_time: updatedAfter })
                },
                retries: 3
            };

            const response = await nango.get<unknown>(proxyConfig);
            const parsed = ExpensesPageSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse expenses page: ${parsed.error.message}`);
            }

            const expenses = parsed.data.expenses.map((record) => {
                const mapped: z.infer<typeof ExpenseSchema> = {
                    id: record.expense_id,
                    expense_id: record.expense_id,
                    ...(record.date != null && { date: record.date }),
                    ...(record.user_name != null && { user_name: record.user_name }),
                    ...(record.account_name != null && { account_name: record.account_name }),
                    ...(record.description != null && { description: record.description }),
                    ...(record.currency_id != null && { currency_id: record.currency_id }),
                    ...(record.currency_code != null && { currency_code: record.currency_code }),
                    ...(record.bcy_total != null && { bcy_total: record.bcy_total }),
                    ...(record.bcy_total_without_tax != null && { bcy_total_without_tax: record.bcy_total_without_tax }),
                    ...(record.total != null && { total: record.total }),
                    ...(record.total_without_tax != null && { total_without_tax: record.total_without_tax }),
                    ...(record.is_billable != null && { is_billable: record.is_billable }),
                    ...(record.reference_number != null && { reference_number: record.reference_number }),
                    ...(record.customer_id != null && { customer_id: record.customer_id }),
                    ...(record.customer_name != null && { customer_name: record.customer_name }),
                    ...(record.is_personal != null && { is_personal: record.is_personal }),
                    ...(record.status != null && { status: record.status }),
                    ...(record.created_time != null && { created_time: record.created_time }),
                    ...(record.last_modified_time != null && { last_modified_time: record.last_modified_time }),
                    ...(record.expense_receipt_name != null && { expense_receipt_name: record.expense_receipt_name }),
                    ...(record.exchange_rate != null && { exchange_rate: record.exchange_rate }),
                    ...(record.distance != null && { distance: record.distance }),
                    ...(record.mileage_rate != null && { mileage_rate: record.mileage_rate }),
                    ...(record.mileage_unit != null && { mileage_unit: record.mileage_unit }),
                    ...(record.mileage_type != null && { mileage_type: record.mileage_type }),
                    ...(record.expense_type != null && { expense_type: record.expense_type }),
                    ...(record.report_id != null && { report_id: record.report_id }),
                    ...(record.report_name != null && { report_name: record.report_name }),
                    ...(record.report_number != null && { report_number: record.report_number }),
                    ...(record.has_attachment != null && { has_attachment: record.has_attachment }),
                    ...(record.start_reading != null && { start_reading: record.start_reading }),
                    ...(record.end_reading != null && { end_reading: record.end_reading })
                };
                return mapped;
            });

            if (expenses.length > 0) {
                await nango.batchSave(expenses, 'Expense');
            }

            for (const record of parsed.data.expenses) {
                const timestamp = toTimestamp(record.last_modified_time);
                if (timestamp !== undefined && (latestModifiedTimestamp === undefined || timestamp > latestModifiedTimestamp)) {
                    latestModifiedTimestamp = timestamp;
                    latestModifiedTime = record.last_modified_time ?? undefined;
                }
            }

            if (parsed.data.page_context.has_more_page && expenses.length > 0) {
                page = parsed.data.page_context.page + 1;
                await nango.saveCheckpoint({
                    updated_after: updatedAfter ?? '',
                    page
                });
                continue;
            }

            if (latestModifiedTime !== undefined) {
                updatedAfter = latestModifiedTime;
            }

            await nango.saveCheckpoint({
                updated_after: updatedAfter ?? '',
                page: 1
            });
            hasMorePages = false;
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
