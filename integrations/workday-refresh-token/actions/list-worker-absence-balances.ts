import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        workerId: z.string().describe('Workday ID of the worker whose absence balances to list. Example: "123456789"')
    })
    .describe("Input for listing a worker's absence/PTO plan balances.");

const ProviderReferenceSchema = z.object({
    id: z.string().optional(),
    descriptor: z.string().optional()
});

const ProviderBalanceItemSchema = z.object({
    unit: ProviderReferenceSchema.optional(),
    category: ProviderReferenceSchema.optional(),
    worker: ProviderReferenceSchema.optional(),
    effectiveDate: z.string().optional(),
    quantity: z.union([z.string(), z.number()]).optional(),
    absencePlan: ProviderReferenceSchema.optional()
});

const ProviderCollectionSchema = z.object({
    data: z.array(z.unknown()).optional(),
    total: z.number().optional()
});

const BalanceSchema = z.object({
    id: z.string().describe('Workday ID of the absence balance record.'),
    planId: z.string().optional().describe('Workday ID of the absence plan.'),
    planName: z.string().optional().describe('Name of the absence plan, e.g. "PTO" or "Sick Leave".'),
    category: z.string().optional().describe('Category of the absence plan, e.g. "Time Off Plan" or "Leave of Absence Type".'),
    balance: z.number().optional().describe('Current available balance.'),
    unit: z.string().optional().describe('Unit of measure, e.g. "Hours" or "Days".'),
    effectiveDate: z.string().optional().describe('Date the balance was calculated, in yyyy-mm-dd format.')
});

const OutputSchema = z
    .object({
        balances: z.array(BalanceSchema).describe('List of current absence/PTO plan balances for the worker.')
    })
    .describe("Output containing a list of a worker's current absence/PTO plan balances.");

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET request to retrieve a worker's absence balances.
 * @pitfalls: The response includes both Time Off plans and Leave of Absence types with differing units (Hours or Days); effectiveDate is the as-of date for each balance.
 */
const action = createAction({
    description: "List a worker's current absence/PTO plan balances",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const metadata = await nango.getMetadata<{ tenant?: string }>();
        const tenant = connection.connection_config?.['tenant'] ?? metadata?.['tenant'];

        if (typeof tenant !== 'string' || tenant.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_connection_config',
                message: 'Missing required connection_config.tenant for Workday proxy call.'
            });
        }

        const config: ProxyConfiguration = {
            // https://community.workday.com/sites/default/files/file-hosting/restapi/index.html
            endpoint: `absenceManagement/v4/${encodeURIComponent(tenant)}/balances`,
            params: {
                worker: input.workerId
            },
            retries: 3
        };

        const response = await nango.get(config);

        const responseData: unknown = response.data;

        if (responseData === undefined || responseData === null) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No absence balance data returned for the worker.',
                workerId: input.workerId
            });
        }

        let rawItems: unknown[] = [];
        if (Array.isArray(responseData)) {
            rawItems = responseData;
        } else {
            const parsedCollection = ProviderCollectionSchema.safeParse(responseData);
            if (parsedCollection.success && Array.isArray(parsedCollection.data.data)) {
                rawItems = parsedCollection.data.data;
            }
        }

        const balances: z.infer<typeof BalanceSchema>[] = [];

        for (const item of rawItems) {
            const parsed = ProviderBalanceItemSchema.safeParse(item);
            if (!parsed.success) {
                continue;
            }

            const raw = parsed.data;
            if (!raw.absencePlan?.id) {
                continue;
            }

            const balanceValue = typeof raw.quantity === 'string' ? parseFloat(raw.quantity) : raw.quantity;

            balances.push({
                id: raw.absencePlan.id,
                ...(raw.absencePlan.id !== undefined && { planId: raw.absencePlan.id }),
                ...(raw.absencePlan.descriptor !== undefined && { planName: raw.absencePlan.descriptor }),
                ...(raw.category?.descriptor !== undefined && { category: raw.category.descriptor }),
                ...(balanceValue !== undefined && !Number.isNaN(balanceValue) && { balance: balanceValue }),
                ...(raw.unit?.descriptor !== undefined && { unit: raw.unit.descriptor }),
                ...(raw.effectiveDate !== undefined && { effectiveDate: raw.effectiveDate })
            });
        }

        return { balances };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
