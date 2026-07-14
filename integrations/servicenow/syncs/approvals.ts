import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderApprovalSchema = z.object({
    sys_id: z.string(),
    sys_updated_on: z.string(),
    sys_created_on: z.string().optional(),
    state: z.string().optional(),
    approver: z.string().optional(),
    document_id: z.string().optional(),
    source_table: z.string().optional(),
    comments: z.string().optional(),
    due_date: z.string().optional(),
    sysapproval: z.string().optional()
});

const ApprovalSchema = z.object({
    id: z.string(),
    sys_updated_on: z.string(),
    sys_created_on: z.string().optional(),
    state: z.string().optional(),
    approver: z.string().optional(),
    document_id: z.string().optional(),
    source_table: z.string().optional(),
    comments: z.string().optional(),
    due_date: z.string().optional(),
    sysapproval: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync approval records (sysapproval_approver)',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Approval: ApprovalSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const query = checkpoint?.['updated_after'] ? `sys_updated_on>=${checkpoint['updated_after']}^ORDERBYsys_updated_on` : 'ORDERBYsys_updated_on';

        const proxyConfig: ProxyConfiguration = {
            // https://developer.servicenow.com/dev.do#!/reference/api/now/table
            endpoint: '/api/now/table/sysapproval_approver',
            params: {
                sysparm_query: query,
                sysparm_limit: 100,
                sysparm_display_value: 'false',
                sysparm_exclude_reference_link: 'true'
            },
            paginate: {
                type: 'link',
                limit_name_in_request: 'sysparm_limit',
                limit: 100,
                response_path: 'result',
                link_rel_in_response_header: 'next'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderApprovalSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse approvals page: ${parsed.error}`);
            }

            const approvals = parsed.data.map((record) => ({
                id: record.sys_id,
                sys_updated_on: record.sys_updated_on,
                ...(record.sys_created_on != null && { sys_created_on: record.sys_created_on }),
                ...(record.state != null && { state: record.state }),
                ...(record.approver != null && { approver: record.approver }),
                ...(record.document_id != null && { document_id: record.document_id }),
                ...(record.source_table != null && { source_table: record.source_table }),
                ...(record.comments != null && { comments: record.comments }),
                ...(record.due_date != null && { due_date: record.due_date }),
                ...(record.sysapproval != null && { sysapproval: record.sysapproval })
            }));

            if (approvals.length === 0) {
                continue;
            }

            await nango.batchSave(approvals, 'Approval');

            const lastApproval = approvals[approvals.length - 1];
            if (lastApproval !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: lastApproval.sys_updated_on
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
