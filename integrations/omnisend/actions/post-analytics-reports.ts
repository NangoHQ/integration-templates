import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z
    .object({
        body: z
            .object({
                queries: z
                    .array(
                        z
                            .object({
                                alias: z.string().optional(),
                                dateRange: z
                                    .object({ from: z.string().optional(), interval: z.string().optional(), to: z.string().optional() })
                                    .passthrough()
                                    .optional(),
                                dimensions: z
                                    .array(z.object({ granularity: z.string().min(1).optional(), name: z.string().min(1).optional() }).passthrough())
                                    .optional(),
                                filters: z
                                    .array(
                                        z
                                            .object({
                                                name: z.string().min(1).optional(),
                                                operator: z.string().min(1).optional(),
                                                values: z.unknown().optional()
                                            })
                                            .passthrough()
                                    )
                                    .optional(),
                                metrics: z.array(z.object({ name: z.string().min(1).optional() }).passthrough()).optional()
                            })
                            .passthrough()
                    )
                    .min(1)
            })
            .passthrough()
    })
    .passthrough();
const output = z
    .object({
        reports: z
            .array(
                z
                    .object({
                        alias: z.string().optional(),
                        dimensions: z.array(z.object({ granularity: z.string().optional(), name: z.string().optional() }).passthrough()).optional(),
                        metrics: z.array(z.object({ name: z.string().optional() }).passthrough()).optional(),
                        rows: z.array(z.record(z.string(), z.unknown())).optional()
                    })
                    .passthrough()
            )
            .optional()
    })
    .passthrough();

const action = createAction({
    description: 'Generate report',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/omnisend/postAnalyticsReports',
        group: 'Analytics'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse((await callOmnisend(nango, 'POST', '/analytics/reports', requestInput)).data)
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
