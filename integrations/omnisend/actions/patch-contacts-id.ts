import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend, contactUpdateSchema, contactSchema } from '../shared.js';

const input = z.object({ id: z.string().min(1), body: contactUpdateSchema }).passthrough();
const output = contactSchema;

const action = createAction({
    description: 'Update contact by ID',
    version: '1.0.0',
    endpoint: {
        method: 'PATCH',
        path: '/omnisend/patchContactsId',
        group: 'Contacts'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'PATCH', '/contacts/{id}', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
