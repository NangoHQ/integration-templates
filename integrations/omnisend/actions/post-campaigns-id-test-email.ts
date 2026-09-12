/* Generated from the pinned Omnisend OpenAPI snapshot. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({"id": z.string().min(1), body: z.object({"recipients": z.array(z.string()).optional()}).passthrough()}).passthrough();
const output = z.unknown();

const action = createAction({
    description: 'Send campaign test email',
    version: '1.0.0',
    // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
    endpoint: {
        method: 'POST',
        path: '/omnisend/postCampaignsIdTestEmail',
        group: 'Campaigns'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse(
    (await callOmnisend(nango, 'POST', '/campaigns/{id}/test-email', requestInput as Record<string, unknown>)).data
    )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
