/* Generated from the pinned Omnisend OpenAPI snapshot. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({body: z.object({"displayName": z.string().optional(), "name": z.string().optional(), "origin": z.string().optional(), "properties": z.record(z.string(), z.unknown()).optional()}).passthrough()}).passthrough();
const output = z.object({"event": z.object({"displayName": z.string().optional(), "explicitlyDefined": z.boolean().optional(), "name": z.string().optional(), "origins": z.array(z.string()).optional(), "properties": z.record(z.string(), z.unknown()).optional()}).passthrough().optional()}).passthrough();

const action = createAction({
    description: 'Update custom event metadata',
    version: '1.0.0',
    // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
    endpoint: {
        method: 'PUT',
        path: '/omnisend/putEventMetadata',
        group: 'EventMetadata'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse(
    (await callOmnisend(nango, 'PUT', '/event-metadata', requestInput as Record<string, unknown>)).data
    )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
