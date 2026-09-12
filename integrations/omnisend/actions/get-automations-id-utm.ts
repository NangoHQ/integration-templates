import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({ id: z.string().min(1) }).passthrough();
const output = z
    .object({
        blocks: z
            .array(
                z
                    .object({
                        blockID: z.string().optional(),
                        tags: z
                            .object({ campaign: z.string().optional(), medium: z.string().optional(), source: z.string().optional() })
                            .passthrough()
                            .optional()
                    })
                    .passthrough()
            )
            .optional()
    })
    .passthrough();

const action = createAction({
    description: 'Get aggregated UTM tags for all blocks',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/omnisend/getAutomationsIdUtm',
        group: 'Automations'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'GET', '/automations/{id}/utm', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
