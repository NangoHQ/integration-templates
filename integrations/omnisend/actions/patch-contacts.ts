import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend, contactUpdateSchema, contactSchema } from '../shared.js';

const input = z.object({ email: z.string().email(), body: contactUpdateSchema }).passthrough();
const output = contactSchema;

const action = createAction({
    description: 'Update contact by email',
    version: '1.0.0',
    endpoint: {
        method: 'PATCH',
        path: '/omnisend/patchContacts',
        group: 'Contacts'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'PATCH', '/contacts', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
