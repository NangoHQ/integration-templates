import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RequisitionAttributeValueSchema = z
    .object({
        body: z.union([z.string(), z.number(), z.boolean()]).optional(),
        choices: z.array(z.string()).optional()
    })
    .passthrough();

const RequisitionAttributeSchema = z
    .object({
        name: z.string().optional(),
        value: RequisitionAttributeValueSchema.optional(),
        data: z
            .object({
                amount: z.number().optional(),
                frequency: z.string().optional(),
                currency_iso: z.string().optional()
            })
            .optional()
    })
    .passthrough();

const ApproverSchema = z.object({
    id: z.string(),
    name: z.string(),
    decision: z.string().optional()
});

const ApprovalGroupSchema = z
    .object({
        id: z.string(),
        approvers: z.array(ApproverSchema).optional()
    })
    .passthrough();

const RequisitionSchema = z.object({
    id: z.string(),
    code: z.string(),
    job: z
        .object({
            id: z.string(),
            title: z.string()
        })
        .optional(),
    department: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    location: z
        .object({
            location_str: z.string().optional(),
            country: z.string().optional(),
            country_code: z.string().optional(),
            region: z.string().optional(),
            region_code: z.string().optional(),
            city: z.string().optional(),
            zip_code: z.string().optional()
        })
        .optional(),
    requester: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    hiring_manager: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    owner: z
        .object({
            id: z.string(),
            name: z.string()
        })
        .optional(),
    plan_date: z.string().optional(),
    start_date: z.string().optional(),
    salary_range: z
        .object({
            from: z.number().optional(),
            to: z.number().optional(),
            frequency: z.string().optional(),
            currency_iso: z.string().optional()
        })
        .optional(),
    salary: z
        .object({
            amount: z.number().optional(),
            frequency: z.string().optional(),
            currency_iso: z.string().optional()
        })
        .optional(),
    candidate_id: z.string().optional(),
    employment_type: z.string().optional(),
    reason: z.string().optional(),
    state: z.string().optional(),
    requisition_attributes: z.array(RequisitionAttributeSchema).optional(),
    approval_groups: z.array(ApprovalGroupSchema).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync headcount requisitions (Hiring Plan feature)',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Requisition: RequisitionSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse(rawCheckpoint ?? { updated_after: '' });
        const updatedAfter = checkpoint.updated_after || undefined;
        let maxUpdatedAt = updatedAfter;

        const params: Record<string, string | number> = {
            limit: 100
        };
        if (updatedAfter) {
            params['updated_after'] = updatedAfter;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://workable.readme.io/reference/requisitions
            endpoint: '/spi/v3/requisitions',
            params,
            paginate: {
                type: 'link',
                link_path_in_response_body: 'paging.next',
                response_path: 'requisitions',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retryOn: [404, 429],
            retries: 3
        };

        for await (const page of nango.paginate<z.infer<typeof RequisitionSchema>>(proxyConfig)) {
            const requisitions = page;
            if (requisitions.length === 0) {
                continue;
            }

            await nango.batchSave(requisitions, 'Requisition');

            for (const req of requisitions) {
                if (req.updated_at && (!maxUpdatedAt || req.updated_at > maxUpdatedAt)) {
                    maxUpdatedAt = req.updated_at;
                }
            }
        }

        if (maxUpdatedAt && maxUpdatedAt !== updatedAfter) {
            await nango.saveCheckpoint({
                updated_after: maxUpdatedAt
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
