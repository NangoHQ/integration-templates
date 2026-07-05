import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    accountId: z.string().min(1)
});

const ProviderEstimateSchema = z.object({
    id: z.number(),
    estimate_number: z.string().optional(),
    customerid: z.number().optional(),
    status: z.number().optional(),
    amount: z
        .object({
            amount: z.string().optional(),
            code: z.string().optional()
        })
        .optional(),
    currency_code: z.string().optional(),
    create_date: z.string().optional(),
    updated: z.string().optional(),
    created_at: z.string().optional(),
    vis_state: z.number().optional(),
    ui_status: z.string().optional(),
    organization: z.string().optional(),
    fname: z.string().optional(),
    lname: z.string().optional()
});

const EstimateModelSchema = z.object({
    id: z.string(),
    estimate_number: z.string().optional(),
    customerid: z.number().optional(),
    status: z.number().optional(),
    amount: z
        .object({
            amount: z.string().optional(),
            code: z.string().optional()
        })
        .optional(),
    currency_code: z.string().optional(),
    create_date: z.string().optional(),
    updated: z.string().optional(),
    created_at: z.string().optional(),
    vis_state: z.number().optional(),
    ui_status: z.string().optional(),
    organization: z.string().optional(),
    fname: z.string().optional(),
    lname: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync estimates.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Estimate: EstimateModelSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error(`Invalid metadata: ${parsedMetadata.error.message}`);
        }
        const accountId = parsedMetadata.data.accountId;

        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after || undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://www.freshbooks.com/api/estimates
            endpoint: `/accounting/account/${encodeURIComponent(accountId)}/estimates/estimates`,
            params: {
                sort: 'updated:asc',
                ...(updatedAfter && { 'search[updated_since]': updatedAfter })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'response.result.estimates'
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const estimates = [];
            let maxUpdated: string | undefined;

            for (const raw of pageResults) {
                const parsed = ProviderEstimateSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse estimate: ${parsed.error.message}`);
                }

                const estimate = parsed.data;
                estimates.push({
                    id: String(estimate.id),
                    ...(estimate.estimate_number !== undefined && { estimate_number: estimate.estimate_number }),
                    ...(estimate.customerid !== undefined && { customerid: estimate.customerid }),
                    ...(estimate.status !== undefined && { status: estimate.status }),
                    ...(estimate.amount !== undefined && { amount: estimate.amount }),
                    ...(estimate.currency_code !== undefined && { currency_code: estimate.currency_code }),
                    ...(estimate.create_date !== undefined && { create_date: estimate.create_date }),
                    ...(estimate.updated !== undefined && { updated: estimate.updated }),
                    ...(estimate.created_at !== undefined && { created_at: estimate.created_at }),
                    ...(estimate.vis_state !== undefined && { vis_state: estimate.vis_state }),
                    ...(estimate.ui_status !== undefined && { ui_status: estimate.ui_status }),
                    ...(estimate.organization !== undefined && { organization: estimate.organization }),
                    ...(estimate.fname !== undefined && { fname: estimate.fname }),
                    ...(estimate.lname !== undefined && { lname: estimate.lname })
                });

                if (estimate.updated) {
                    const formatted = estimate.updated.replace(' ', 'T');
                    if (maxUpdated === undefined || formatted > maxUpdated) {
                        maxUpdated = formatted;
                    }
                }
            }

            if (estimates.length === 0) {
                continue;
            }

            await nango.batchSave(estimates, 'Estimate');

            if (maxUpdated) {
                await nango.saveCheckpoint({
                    updated_after: maxUpdated
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
