import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ContactSummarySchema = z
    .object({
        id: z.string(),
        lead_id: z.string(),
        name: z.string().optional(),
        title: z.string().optional(),
        date_updated: z.string().optional(),
        phones: z.array(z.unknown()).optional(),
        emails: z.array(z.unknown()).optional()
    })
    .passthrough();

const OpportunitySummarySchema = z
    .object({
        id: z.string(),
        lead_id: z.string(),
        lead_name: z.string().optional(),
        status_id: z.string().optional(),
        status_label: z.string().optional(),
        value: z.number().optional(),
        value_period: z.string().optional(),
        date_updated: z.string().optional()
    })
    .passthrough();

const TaskSummarySchema = z
    .object({
        id: z.string(),
        lead_id: z.string(),
        text: z.string().optional(),
        due_date: z.string().optional(),
        date_updated: z.string().optional()
    })
    .passthrough();

const LeadSchema = z
    .object({
        id: z.string(),
        display_name: z.string().optional(),
        name: z.string().optional(),
        url: z.string().optional(),
        organization_id: z.string().optional(),
        status_id: z.string().optional(),
        status_label: z.string().optional(),
        contacts: z.array(ContactSummarySchema).optional(),
        opportunities: z.array(OpportunitySummarySchema).optional(),
        tasks: z.array(TaskSummarySchema).optional(),
        date_created: z.string().optional(),
        date_updated: z.string(),
        custom: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Incrementally sync Close leads using date_updated checkpoints.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Lead: LeadSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const updatedAfter = checkpoint?.updated_after;
        const isFirstRun = !updatedAfter;

        const proxyConfig: ProxyConfiguration = {
            // https://developer.close.com/resources/leads/
            endpoint: '/v1/lead/',
            params: {
                ...(updatedAfter && { date_updated__gt: updatedAfter })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: '_skip',
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: '_limit',
                limit: 200,
                response_path: 'data'
            },
            retries: 3
        };

        if (isFirstRun) {
            await nango.trackDeletesStart('Lead');
        }

        let maxDateUpdated = '';

        for await (const page of nango.paginate(proxyConfig)) {
            const items = z.array(z.unknown()).parse(page);
            const leads = [];

            for (const item of items) {
                const lead = LeadSchema.safeParse(item);
                if (!lead.success) {
                    throw new Error(`Failed to parse lead: ${lead.error.message}`);
                }
                leads.push(lead.data);
            }

            if (leads.length === 0) {
                continue;
            }

            for (const lead of leads) {
                if (lead.date_updated > maxDateUpdated) {
                    maxDateUpdated = lead.date_updated;
                }
            }

            await nango.batchSave(leads, 'Lead');
        }

        if (isFirstRun) {
            await nango.trackDeletesEnd('Lead');
        }

        if (maxDateUpdated !== '') {
            await nango.saveCheckpoint({
                updated_after: maxDateUpdated
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
