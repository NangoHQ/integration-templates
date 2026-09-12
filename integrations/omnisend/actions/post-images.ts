/* Generated from the pinned Omnisend OpenAPI snapshot. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({body: z.object({"name": z.string().optional(), "url": z.string().optional()}).passthrough()}).passthrough();
const output = z.object({"createdAt": z.string().optional(), "height": z.number().optional(), "id": z.string().optional(), "name": z.string().optional(), "size": z.number().optional(), "type": z.string().optional(), "url": z.string().optional(), "width": z.number().optional()}).passthrough();

const action = createAction({
    description: 'Upload image by URL',
    version: '1.0.0',
    // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
    endpoint: {
        method: 'POST',
        path: '/omnisend/postImages',
        group: 'Images'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse(
    (await callOmnisend(nango, 'POST', '/images', requestInput as Record<string, unknown>)).data
    )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
