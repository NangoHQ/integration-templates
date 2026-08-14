import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const AmountSchema = z
    .object({
        currency: z.string().optional().describe('ISO-4217 currency code, e.g. AUD, USD.'),
        value: z.number().optional().describe('Monetary value in the specified currency.')
    })
    .describe('A monetary amount with currency and value.');

const ProjectSchema = z
    .object({
        id: z.string().describe('Unique identifier of the project.'),
        contactId: z.string().optional().describe('Identifier of the contact this project was created for.'),
        name: z.string().describe('Name of the project.'),
        currencyCode: z.string().optional().describe('ISO-4217 currency code for the project.'),
        minutesLogged: z.number().int().optional().describe('Total minutes logged against all tasks on the project.'),
        totalTaskAmount: AmountSchema.optional().describe('Total monetary value of all tasks on the project.'),
        totalExpenseAmount: AmountSchema.optional().describe('Total monetary value of all expenses on the project.'),
        minutesToBeInvoiced: z.number().int().optional().describe('Minutes not yet invoiced across all chargeable tasks in the project.'),
        taskAmountToBeInvoiced: AmountSchema.optional().describe('Task amount not yet invoiced.'),
        taskAmountInvoiced: AmountSchema.optional().describe('Task amount already invoiced.'),
        expenseAmountToBeInvoiced: AmountSchema.optional().describe('Expense amount not yet invoiced.'),
        expenseAmountInvoiced: AmountSchema.optional().describe('Expense amount already invoiced.'),
        projectAmountInvoiced: AmountSchema.optional().describe('Project amount already invoiced.'),
        deposit: AmountSchema.optional().describe('Deposit amount applied to the project.'),
        depositApplied: AmountSchema.optional().describe('Deposit amount already applied to the project.'),
        creditNoteAmount: AmountSchema.optional().describe('Credit note amount applied to the project.'),
        deadlineUtc: z.string().optional().describe('Deadline for the project in ISO-8601 UTC format.'),
        totalInvoiced: AmountSchema.optional().describe('Total amount invoiced for the project.'),
        totalToBeInvoiced: AmountSchema.optional().describe('Total amount yet to be invoiced for the project.'),
        estimate: AmountSchema.optional().describe('Original estimate for the project.'),
        status: z.string().optional().describe('Status of the project: INPROGRESS or CLOSED.')
    })
    .describe('A Xero project tracking time, costs, and profitability.');

const ProviderAmountSchema = z.object({
    currency: z.string().optional(),
    value: z.number().optional()
});

const ProviderProjectSchema = z.object({
    projectId: z.string(),
    contactId: z.string().optional(),
    name: z.string(),
    currencyCode: z.string().optional(),
    minutesLogged: z.number().int().optional(),
    totalTaskAmount: ProviderAmountSchema.optional(),
    totalExpenseAmount: ProviderAmountSchema.optional(),
    estimateAmount: ProviderAmountSchema.optional(),
    minutesToBeInvoiced: z.number().int().optional(),
    taskAmountToBeInvoiced: ProviderAmountSchema.optional(),
    taskAmountInvoiced: ProviderAmountSchema.optional(),
    expenseAmountToBeInvoiced: ProviderAmountSchema.optional(),
    expenseAmountInvoiced: ProviderAmountSchema.optional(),
    projectAmountInvoiced: ProviderAmountSchema.optional(),
    deposit: ProviderAmountSchema.optional(),
    depositApplied: ProviderAmountSchema.optional(),
    creditNoteAmount: ProviderAmountSchema.optional(),
    deadlineUtc: z.string().optional(),
    totalInvoiced: ProviderAmountSchema.optional(),
    totalToBeInvoiced: ProviderAmountSchema.optional(),
    estimate: ProviderAmountSchema.optional(),
    status: z.string().optional()
});

const sync = createSync({
    description: 'Sync projects from the Xero Projects API.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Project: ProjectSchema
    },

    exec: async (nango) => {
        const tenantId = await resolveTenantId(nango);

        // Blocker: The Xero Projects API GET /Projects endpoint does not support
        // any changed-since filter, deleted-record endpoint, or resumable cursor.
        // Projects can only transition to CLOSED status and cannot be deleted via API.
        await nango.trackDeletesStart('Project');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/projects/projects
            endpoint: 'projects.xro/2.0/Projects',
            headers: {
                'xero-tenant-id': tenantId
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'pageSize',
                limit: 100,
                response_path: 'items'
            },
            retries: 3
        };

        for await (const rawProjects of nango.paginate(proxyConfig)) {
            if (!Array.isArray(rawProjects)) {
                throw new Error('Unexpected response: projects items is not an array.');
            }

            const projects: Array<z.infer<typeof ProjectSchema>> = [];
            for (const raw of rawProjects) {
                const parsed = ProviderProjectSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse project: ${JSON.stringify(parsed.error.issues)}`);
                }
                projects.push(mapProject(parsed.data));
            }

            if (projects.length > 0) {
                await nango.batchSave(projects, 'Project');
            }
        }

        await nango.trackDeletesEnd('Project');
    }
});

function mapProject(raw: z.infer<typeof ProviderProjectSchema>): z.infer<typeof ProjectSchema> {
    return {
        id: raw.projectId,
        ...(raw.contactId !== undefined && { contactId: raw.contactId }),
        name: raw.name,
        ...(raw.currencyCode !== undefined && { currencyCode: raw.currencyCode }),
        ...(raw.minutesLogged !== undefined && { minutesLogged: raw.minutesLogged }),
        ...(raw.totalTaskAmount !== undefined && { totalTaskAmount: mapAmount(raw.totalTaskAmount) }),
        ...(raw.totalExpenseAmount !== undefined && { totalExpenseAmount: mapAmount(raw.totalExpenseAmount) }),
        ...(raw.minutesToBeInvoiced !== undefined && { minutesToBeInvoiced: raw.minutesToBeInvoiced }),
        ...(raw.taskAmountToBeInvoiced !== undefined && { taskAmountToBeInvoiced: mapAmount(raw.taskAmountToBeInvoiced) }),
        ...(raw.taskAmountInvoiced !== undefined && { taskAmountInvoiced: mapAmount(raw.taskAmountInvoiced) }),
        ...(raw.expenseAmountToBeInvoiced !== undefined && { expenseAmountToBeInvoiced: mapAmount(raw.expenseAmountToBeInvoiced) }),
        ...(raw.expenseAmountInvoiced !== undefined && { expenseAmountInvoiced: mapAmount(raw.expenseAmountInvoiced) }),
        ...(raw.projectAmountInvoiced !== undefined && { projectAmountInvoiced: mapAmount(raw.projectAmountInvoiced) }),
        ...(raw.deposit !== undefined && { deposit: mapAmount(raw.deposit) }),
        ...(raw.depositApplied !== undefined && { depositApplied: mapAmount(raw.depositApplied) }),
        ...(raw.creditNoteAmount !== undefined && { creditNoteAmount: mapAmount(raw.creditNoteAmount) }),
        ...(raw.deadlineUtc !== undefined && { deadlineUtc: raw.deadlineUtc }),
        ...(raw.totalInvoiced !== undefined && { totalInvoiced: mapAmount(raw.totalInvoiced) }),
        ...(raw.totalToBeInvoiced !== undefined && { totalToBeInvoiced: mapAmount(raw.totalToBeInvoiced) }),
        ...(raw.estimate !== undefined && { estimate: mapAmount(raw.estimate) }),
        ...(raw.status !== undefined && { status: raw.status })
    };
}

function mapAmount(raw: z.infer<typeof ProviderAmountSchema> | undefined): z.infer<typeof AmountSchema> | undefined {
    if (raw === undefined) {
        return undefined;
    }
    const result: z.infer<typeof AmountSchema> = {};
    if (raw.currency !== undefined) {
        result.currency = raw.currency;
    }
    if (raw.value !== undefined) {
        result.value = raw.value;
    }
    return result;
}

async function resolveTenantId(nango: Parameters<(typeof sync)['exec']>[0]): Promise<string> {
    // https://developer.xero.com/documentation/api/accounting/overview
    const connection = await nango.getConnection();
    const connectionConfig = connection.connection_config;
    if (
        connectionConfig !== null &&
        typeof connectionConfig === 'object' &&
        !Array.isArray(connectionConfig) &&
        'tenant_id' in connectionConfig &&
        typeof connectionConfig['tenant_id'] === 'string' &&
        connectionConfig['tenant_id'].length > 0
    ) {
        return connectionConfig['tenant_id'];
    }

    const metadata = connection.metadata;
    if (
        metadata !== null &&
        typeof metadata === 'object' &&
        !Array.isArray(metadata) &&
        'tenantId' in metadata &&
        typeof metadata['tenantId'] === 'string' &&
        metadata['tenantId'].length > 0
    ) {
        return metadata['tenantId'];
    }

    // https://developer.xero.com/documentation/api/accounting/overview
    const connectionsResponse = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    if (!connectionsResponse.data || !Array.isArray(connectionsResponse.data) || connectionsResponse.data.length === 0) {
        throw new Error('No Xero tenants found for this connection.');
    }

    if (connectionsResponse.data.length > 1) {
        throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
    }

    const firstConnection = connectionsResponse.data[0];
    if (
        !firstConnection ||
        typeof firstConnection !== 'object' ||
        Array.isArray(firstConnection) ||
        !('tenantId' in firstConnection) ||
        typeof firstConnection['tenantId'] !== 'string' ||
        firstConnection['tenantId'].length === 0
    ) {
        throw new Error('Unable to resolve xero-tenant-id.');
    }

    return firstConnection['tenantId'];
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
