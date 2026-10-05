import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderPrioritySchema = z.object({
    id: z.string(),
    summary: z.string().nullable().optional(),
    type: z.string(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    color: z.string().optional(),
    order: z.number().optional()
});

const PrioritySchema = z
    .object({
        id: z.string().describe('The unique identifier of the priority.'),
        summary: z.string().optional().describe('A short-form, server-generated string summarizing the priority (e.g., P1).'),
        type: z.string().optional().describe('The schema type of the object, typically "priority".'),
        self: z.string().optional().describe('The API show URL at which the priority is accessible.'),
        html_url: z.string().optional().describe('A URL at which the priority is uniquely displayed in the PagerDuty web app.'),
        name: z.string().optional().describe('The user-provided short name of the priority (e.g., P1).'),
        description: z.string().optional().describe('The user-provided description of the priority.'),
        color: z.string().optional().describe('The hex color associated with the priority for UI display.'),
        order: z.number().optional().describe('The numerical value used to sort priorities; higher values are higher priority.')
    })
    .describe('A priority level configured on the PagerDuty account, representing the importance and impact of an incident.');

const CheckpointSchema = z.object({
    offset: z.number()
});

const sync = createSync({
    description: "Sync the account's configured incident priority levels.",
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['priorities.read'],
    checkpoint: CheckpointSchema,
    models: {
        Priority: PrioritySchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let offset = 0;
        if (checkpoint != null && typeof checkpoint.offset === 'number') {
            offset = checkpoint.offset;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.pagerduty.com/api-reference/
            endpoint: '/priorities',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: offset,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 25,
                response_path: 'priorities'
            },
            retries: 3
        };

        await nango.trackDeletesStart('Priority');

        for await (const page of nango.paginate(proxyConfig)) {
            const rawItems = z.array(ProviderPrioritySchema).parse(page);

            if (rawItems.length === 0) {
                continue;
            }

            const priorities = rawItems.map((item) => {
                return {
                    id: item.id,
                    ...(item.summary != null && { summary: item.summary }),
                    ...(item.type != null && { type: item.type }),
                    ...(item.self != null && { self: item.self }),
                    ...(item.html_url != null && { html_url: item.html_url }),
                    ...(item.name != null && { name: item.name }),
                    ...(item.description != null && { description: item.description }),
                    ...(item.color != null && { color: item.color }),
                    ...(item.order != null && { order: item.order })
                };
            });

            await nango.batchSave(priorities, 'Priority');

            offset = offset + rawItems.length;
            await nango.saveCheckpoint({ offset });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Priority');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
