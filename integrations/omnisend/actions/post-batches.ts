/* Generated from the pinned Omnisend OpenAPI snapshot. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({body: z.object({"endpoint": z.enum(["products", "contacts", "events", "categories"]).optional(), "items": z.array(z.unknown()).optional(), "method": z.enum(["POST", "PUT"]).optional(), "origin": z.string().optional()}).passthrough()}).passthrough();
const output = z.object({"batchID": z.string().optional(), "totalCount": z.number().optional()}).passthrough();

const action = createAction({
    description: 'Create batch',
    version: '1.0.0',
    // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
    endpoint: {
        method: 'POST',
        path: '/omnisend/postBatches',
        group: 'Batches'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse(
    (await callOmnisend(nango, 'POST', '/batches', requestInput as Record<string, unknown>)).data
    )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
