import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    flow_id: z.string().describe('Flow ID. Example: "01ABC123"'),
    status: z.enum(['draft', 'manual', 'live', 'archived']).describe('Target status for the flow.')
});

const ProviderFlowSchema = z.object({
    data: z.object({
        type: z.string(),
        id: z.string(),
        attributes: z.object({
            name: z.string().optional(),
            status: z.string().optional(),
            created: z.string().optional(),
            updated: z.string().optional(),
            trigger_type: z.string().optional()
        })
    })
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    trigger_type: z.string().optional()
});

const action = createAction({
    description: "Update a flow's status (draft/manual/live/archived).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['flows:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://developers.klaviyo.com/en/reference/update_flow
            endpoint: `/api/flows/${encodeURIComponent(input.flow_id)}`,
            headers: {
                revision: '2026-04-15'
            },
            data: {
                data: {
                    type: 'flow',
                    id: input.flow_id,
                    attributes: {
                        status: input.status
                    }
                }
            },
            retries: 3
        });

        const parsed = ProviderFlowSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Klaviyo API',
                details: parsed.error.message
            });
        }

        const flow = parsed.data.data;
        return {
            id: flow.id,
            ...(flow.attributes.name != null && { name: flow.attributes.name }),
            ...(flow.attributes.status != null && { status: flow.attributes.status }),
            ...(flow.attributes.created != null && { created: flow.attributes.created }),
            ...(flow.attributes.updated != null && { updated: flow.attributes.updated }),
            ...(flow.attributes.trigger_type != null && { trigger_type: flow.attributes.trigger_type })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
