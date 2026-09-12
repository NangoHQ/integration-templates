/* Generated from the pinned Omnisend OpenAPI snapshot. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({body: z.object({"conditionGroups": z.array(z.object({"conditions": z.unknown().optional()}).passthrough()).optional(), "name": z.string().optional()}).passthrough()}).passthrough();
const output = z.object({"archivedAt": z.string().optional(), "conditionGroups": z.array(z.object({"conditions": z.array(z.unknown()).optional()}).passthrough()).optional(), "createdAt": z.string().optional(), "isStarred": z.boolean().optional(), "name": z.string().optional(), "segmentID": z.string().optional(), "status": z.enum(["ready", "building", "archived"]).optional(), "updatedAt": z.string().optional()}).passthrough();

const action = createAction({
    description: 'Create segment',
    version: '1.0.0',
    // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
    endpoint: {
        method: 'POST',
        path: '/omnisend/postSegments',
        group: 'Segments'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse(
    (await callOmnisend(nango, 'POST', '/segments', requestInput as Record<string, unknown>)).data
    )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
