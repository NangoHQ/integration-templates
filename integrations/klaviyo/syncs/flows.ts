import { createSync } from 'nango';
import { z } from 'zod';

const FlowModelSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    trigger_type: z.string().optional(),
    flow_type: z.string().optional(),
    archived: z.boolean().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    cursor: z.string()
});

const FlowAttributesSchema = z
    .object({
        name: z.string().nullish(),
        status: z.string().nullish(),
        created: z.string().nullish(),
        updated: z.string().nullish(),
        trigger_type: z.string().nullish(),
        flow_type: z.string().nullish(),
        archived: z.boolean().nullish()
    })
    .passthrough();

const FlowDataSchema = z.object({
    type: z.string(),
    id: z.string(),
    attributes: FlowAttributesSchema
});

const FlowsResponseSchema = z.object({
    data: z.array(z.unknown()),
    links: z
        .object({
            self: z.string().nullish(),
            next: z.string().nullish(),
            prev: z.string().nullish()
        })
        .optional()
});

const sync = createSync({
    description: 'Sync flows.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Flow: FlowModelSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.['updated_after'] || undefined;
        let cursor = checkpoint?.['cursor'] || undefined;

        let maxUpdated: string | undefined;

        let hasNextPage = true;
        while (hasNextPage) {
            const params: Record<string, string> = {
                ['page[size]']: '50'
            };
            if (updatedAfter) {
                params['filter'] = `greater-than(updated,${updatedAfter})`;
            }
            if (cursor) {
                params['page[cursor]'] = cursor;
            }

            // https://developers.klaviyo.com/en/reference/get_flows
            const response = await nango.get({
                endpoint: '/api/flows',
                params,
                headers: { revision: '2026-04-15' },
                retries: 3
            });

            const parsed = FlowsResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse flows response: ${parsed.error.message}`);
            }

            const flowsData = parsed.data.data;
            const links = parsed.data.links;

            const flows: Array<z.infer<typeof FlowModelSchema>> = [];

            for (const item of flowsData) {
                const flowParsed = FlowDataSchema.safeParse(item);
                if (!flowParsed.success) {
                    throw new Error(`Failed to parse flow item: ${flowParsed.error.message}`);
                }

                const attrs = flowParsed.data.attributes;
                const flow: z.infer<typeof FlowModelSchema> = {
                    id: flowParsed.data.id
                };
                if (attrs.name != null) {
                    flow['name'] = attrs.name;
                }
                if (attrs.status != null) {
                    flow['status'] = attrs.status;
                }
                if (attrs.created != null) {
                    flow['created'] = attrs.created;
                }
                if (attrs.updated != null) {
                    flow['updated'] = attrs.updated;
                }
                if (attrs.trigger_type != null) {
                    flow['trigger_type'] = attrs.trigger_type;
                }
                if (attrs.flow_type != null) {
                    flow['flow_type'] = attrs.flow_type;
                }
                if (attrs.archived != null) {
                    flow['archived'] = attrs.archived;
                }

                flows.push(flow);

                if (attrs.updated) {
                    if (!maxUpdated || attrs.updated > maxUpdated) {
                        maxUpdated = attrs.updated;
                    }
                }
            }

            if (flows.length > 0) {
                await nango.batchSave(flows, 'Flow');
            }

            const nextLink = links?.next;
            if (!nextLink) {
                hasNextPage = false;
                continue;
            }

            const nextUrl = new URL(nextLink);
            const nextCursor = nextUrl.searchParams.get('page[cursor]');
            if (!nextCursor) {
                hasNextPage = false;
                continue;
            }

            cursor = nextCursor;

            await nango.saveCheckpoint({
                updated_after: updatedAfter || '',
                cursor
            });
        }

        if (maxUpdated) {
            await nango.saveCheckpoint({
                updated_after: maxUpdated,
                cursor: ''
            });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
