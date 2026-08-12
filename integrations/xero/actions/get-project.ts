import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('Unique identifier of the Xero project. Example: "52eb8055-e6b9-44b4-b8f3-18631813e99a"')
    })
    .describe('Input for retrieving a single Xero project by its identifier');

const AmountSchema = z.object({
    currency: z.string().optional().nullable(),
    value: z.number().optional().nullable()
});

const ProviderProjectSchema = z.object({
    projectId: z.string(),
    contactId: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    currencyCode: z.string().optional().nullable(),
    minutesLogged: z.number().optional().nullable(),
    totalTaskAmount: AmountSchema.optional().nullable(),
    totalExpenseAmount: AmountSchema.optional().nullable(),
    estimateAmount: AmountSchema.optional().nullable(),
    minutesToBeInvoiced: z.number().optional().nullable(),
    taskAmountToBeInvoiced: AmountSchema.optional().nullable(),
    taskAmountInvoiced: AmountSchema.optional().nullable(),
    expenseAmountToBeInvoiced: AmountSchema.optional().nullable(),
    expenseAmountInvoiced: AmountSchema.optional().nullable(),
    projectAmountInvoiced: AmountSchema.optional().nullable(),
    deposit: AmountSchema.optional().nullable(),
    depositApplied: AmountSchema.optional().nullable(),
    creditNoteAmount: AmountSchema.optional().nullable(),
    deadlineUtc: z.string().optional().nullable(),
    totalInvoiced: AmountSchema.optional().nullable(),
    totalToBeInvoiced: AmountSchema.optional().nullable(),
    estimate: AmountSchema.optional().nullable(),
    status: z.string().optional().nullable(),
    actualRevenue: AmountSchema.optional().nullable(),
    percentComplete: z.number().optional().nullable()
});

const OutputAmountSchema = z.object({
    currency: z.string().optional().describe('Currency code for the monetary value'),
    value: z.number().optional().describe('Monetary value')
});

const OutputSchema = z
    .object({
        projectId: z.string().describe('Unique identifier of the project'),
        contactId: z.string().optional().describe('Identifier of the contact associated with the project'),
        name: z.string().optional().describe('Name of the project'),
        currencyCode: z.string().optional().describe('Currency code for the project'),
        minutesLogged: z.number().optional().describe('Total minutes logged against all tasks'),
        totalTaskAmount: OutputAmountSchema.optional().describe('Total monetary amount across all tasks'),
        totalExpenseAmount: OutputAmountSchema.optional().describe('Total monetary amount across all expenses'),
        estimateAmount: OutputAmountSchema.optional().describe('Estimated monetary amount for the project'),
        minutesToBeInvoiced: z.number().optional().describe('Minutes not yet invoiced'),
        taskAmountToBeInvoiced: OutputAmountSchema.optional().describe('Task amount not yet invoiced'),
        taskAmountInvoiced: OutputAmountSchema.optional().describe('Task amount already invoiced'),
        expenseAmountToBeInvoiced: OutputAmountSchema.optional().describe('Expense amount not yet invoiced'),
        expenseAmountInvoiced: OutputAmountSchema.optional().describe('Expense amount already invoiced'),
        projectAmountInvoiced: OutputAmountSchema.optional().describe('Project amount already invoiced'),
        deposit: OutputAmountSchema.optional().describe('Deposit amount'),
        depositApplied: OutputAmountSchema.optional().describe('Deposit amount applied'),
        creditNoteAmount: OutputAmountSchema.optional().describe('Credit note amount'),
        deadlineUtc: z.string().optional().describe('Project deadline in UTC'),
        totalInvoiced: OutputAmountSchema.optional().describe('Total invoiced amount'),
        totalToBeInvoiced: OutputAmountSchema.optional().describe('Total amount to be invoiced'),
        estimate: OutputAmountSchema.optional().describe('Original estimate value'),
        status: z.string().optional().describe('Project status such as INPROGRESS or CLOSED'),
        actualRevenue: OutputAmountSchema.optional().describe('Actual revenue recognized'),
        percentComplete: z.number().optional().describe('Percentage of project completion')
    })
    .describe('Output representing a single Xero project');

function normalizeAmount(
    amount: { currency?: string | null | undefined; value?: number | null | undefined } | null | undefined
): { currency?: string; value?: number } | undefined {
    if (amount == null) {
        return undefined;
    }
    const normalized: { currency?: string; value?: number } = {};
    if (amount.currency != null) {
        normalized.currency = amount.currency;
    }
    if (amount.value != null) {
        normalized.value = amount.value;
    }
    return normalized;
}

/**
 * @tags: [read]
 * @tagReason: Retrieves a single existing project by identifier with no provider-side mutation.
 * @pitfalls: Multi-tenant connections cause an ActionError until the caller sets a specific tenantId in metadata via get-tenants.
 */
const action = createAction({
    description: 'Retrieve a single project by projectId',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;
        if (connection.connection_config && typeof connection.connection_config === 'object') {
            const cfgTenantId = Reflect.get(connection.connection_config, 'tenant_id');
            if (typeof cfgTenantId === 'string' && cfgTenantId.length > 0) {
                tenantId = cfgTenantId;
            }
        }

        if (!tenantId && connection.metadata && typeof connection.metadata === 'object') {
            const metaTenantId = Reflect.get(connection.metadata, 'tenantId');
            if (typeof metaTenantId === 'string' && metaTenantId.length > 0) {
                tenantId = metaTenantId;
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview#connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const connectionsData = connectionsResponse.data;
            if (!Array.isArray(connectionsData) || connectionsData.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (connectionsData.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const first = connectionsData[0];
            if (first && typeof first === 'object') {
                const firstTenantId = Reflect.get(first, 'tenantId');
                if (typeof firstTenantId === 'string' && firstTenantId.length > 0) {
                    tenantId = firstTenantId;
                }
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/projects/overview
        const response = await nango.get({
            endpoint: `projects.xro/2.0/Projects/${encodeURIComponent(input.projectId)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const providerProject = ProviderProjectSchema.parse(response.data);

        return {
            projectId: providerProject.projectId,
            ...(providerProject.contactId != null && { contactId: providerProject.contactId }),
            ...(providerProject.name != null && { name: providerProject.name }),
            ...(providerProject.currencyCode != null && { currencyCode: providerProject.currencyCode }),
            ...(providerProject.minutesLogged != null && { minutesLogged: providerProject.minutesLogged }),
            ...(providerProject.totalTaskAmount != null && { totalTaskAmount: normalizeAmount(providerProject.totalTaskAmount) }),
            ...(providerProject.totalExpenseAmount != null && { totalExpenseAmount: normalizeAmount(providerProject.totalExpenseAmount) }),
            ...(providerProject.estimateAmount != null && { estimateAmount: normalizeAmount(providerProject.estimateAmount) }),
            ...(providerProject.minutesToBeInvoiced != null && { minutesToBeInvoiced: providerProject.minutesToBeInvoiced }),
            ...(providerProject.taskAmountToBeInvoiced != null && { taskAmountToBeInvoiced: normalizeAmount(providerProject.taskAmountToBeInvoiced) }),
            ...(providerProject.taskAmountInvoiced != null && { taskAmountInvoiced: normalizeAmount(providerProject.taskAmountInvoiced) }),
            ...(providerProject.expenseAmountToBeInvoiced != null && { expenseAmountToBeInvoiced: normalizeAmount(providerProject.expenseAmountToBeInvoiced) }),
            ...(providerProject.expenseAmountInvoiced != null && { expenseAmountInvoiced: normalizeAmount(providerProject.expenseAmountInvoiced) }),
            ...(providerProject.projectAmountInvoiced != null && { projectAmountInvoiced: normalizeAmount(providerProject.projectAmountInvoiced) }),
            ...(providerProject.deposit != null && { deposit: normalizeAmount(providerProject.deposit) }),
            ...(providerProject.depositApplied != null && { depositApplied: normalizeAmount(providerProject.depositApplied) }),
            ...(providerProject.creditNoteAmount != null && { creditNoteAmount: normalizeAmount(providerProject.creditNoteAmount) }),
            ...(providerProject.deadlineUtc != null && { deadlineUtc: providerProject.deadlineUtc }),
            ...(providerProject.totalInvoiced != null && { totalInvoiced: normalizeAmount(providerProject.totalInvoiced) }),
            ...(providerProject.totalToBeInvoiced != null && { totalToBeInvoiced: normalizeAmount(providerProject.totalToBeInvoiced) }),
            ...(providerProject.estimate != null && { estimate: normalizeAmount(providerProject.estimate) }),
            ...(providerProject.status != null && { status: providerProject.status }),
            ...(providerProject.actualRevenue != null && { actualRevenue: normalizeAmount(providerProject.actualRevenue) }),
            ...(providerProject.percentComplete != null && { percentComplete: providerProject.percentComplete })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
