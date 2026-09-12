/* Generated from the pinned Omnisend OpenAPI snapshot. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({body: z.object({"queries": z.array(z.object({"alias": z.unknown().optional(), "dateRange": z.unknown().optional(), "dimensions": z.unknown().optional(), "filters": z.unknown().optional(), "metrics": z.unknown().optional()}).passthrough()).optional()}).passthrough()}).passthrough();
const output = z.object({"statistics": z.array(z.object({"alias": z.string().optional(), "dimensions": z.array(z.unknown()).optional(), "metrics": z.array(z.unknown()).optional(), "rows": z.array(z.unknown()).optional()}).passthrough()).optional()}).passthrough();

const action = createAction({
    description: 'Generate report',
    version: '1.0.0',
    // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
    endpoint: {
        method: 'POST',
        path: '/omnisend/postAnalyticsStatistics',
        group: 'Analytics'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse(
    (await callOmnisend(nango, 'POST', '/analytics/statistics', requestInput as Record<string, unknown>)).data
    )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
