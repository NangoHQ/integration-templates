import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    deploymentId: z.string().describe('The unique identifier of the deployment. Example: "dpl_123abc"')
});

const EventSchema = z
    .object({
        type: z.string().optional(),
        created: z.number().optional(),
        payload: z.record(z.string(), z.unknown()).optional(),
        date: z.number().optional(),
        deploymentId: z.string().optional(),
        id: z.string().optional(),
        serial: z.string().optional(),
        text: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    events: z.array(EventSchema)
});

const action = createAction({
    description: 'List build/runtime log events for a deployment.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://vercel.com/docs/rest-api/deployments/get-deployment-events
            endpoint: `/v3/deployments/${encodeURIComponent(input.deploymentId)}/events`,
            retries: 3
        };

        const response = await nango.get(config);

        const rawArray = z.array(z.unknown()).safeParse(response.data);
        if (!rawArray.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of events from the Vercel API.'
            });
        }

        const events = rawArray.data.map((item) => EventSchema.parse(item));

        return {
            events
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
