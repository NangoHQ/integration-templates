import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z
    .object({
        id: z.string().min(1),
        blockID: z.string().min(1),
        body: z
            .object({ tags: z.object({ campaign: z.string().max(250), medium: z.string().max(250), source: z.string().max(250) }).passthrough() })
            .passthrough()
    })
    .passthrough();
const output = z
    .object({ tags: z.object({ campaign: z.string().optional(), medium: z.string().optional(), source: z.string().optional() }).passthrough().optional() })
    .passthrough();

const action = createAction({
    description: 'Update UTM tags for an automation block',
    version: '1.0.0',
    endpoint: {
        method: 'PUT',
        path: '/omnisend/putAutomationsIdBlocksBlockIDUtm',
        group: 'Automations'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'PUT', '/automations/{id}/blocks/{blockID}/utm', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
