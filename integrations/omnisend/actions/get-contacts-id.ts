import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend, contactSchema } from '../shared.js';

const input = z.object({ id: z.string().min(1) }).passthrough();
const output = contactSchema;

const action = createAction({
    description: 'Get contact',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/omnisend/getContactsId',
        group: 'Contacts'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'GET', '/contacts/{id}', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
