/* Generated from the pinned Omnisend OpenAPI snapshot. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({body: z.object({"contactIDs": z.array(z.string()).optional(), "emails": z.array(z.string()).optional(), "phones": z.array(z.string()).optional(), "segmentID": z.string().optional(), "tags": z.array(z.string()).optional()}).passthrough()}).passthrough();
const output = z.unknown();

const action = createAction({
    description: 'Batch remove tags',
    version: '1.0.0',
    // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
    endpoint: {
        method: 'DELETE',
        path: '/omnisend/deleteContactsTags',
        group: 'Contacts'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse(
    (await callOmnisend(nango, 'DELETE', '/contacts/tags', requestInput as Record<string, unknown>)).data
    )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
