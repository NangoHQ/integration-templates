/* Generated from the pinned Omnisend OpenAPI snapshot. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({"id": z.string().min(1)}).passthrough();
const output = z.object({"tags": z.object({"campaign": z.string().optional(), "medium": z.string().optional(), "source": z.string().optional()}).passthrough().optional(), "variants": z.object({"a": z.object({"id": z.string().optional(), "tags": z.object({"campaign": z.unknown().optional(), "medium": z.unknown().optional(), "source": z.unknown().optional()}).passthrough().optional()}).passthrough().optional(), "b": z.object({"id": z.string().optional(), "tags": z.object({"campaign": z.unknown().optional(), "medium": z.unknown().optional(), "source": z.unknown().optional()}).passthrough().optional()}).passthrough().optional()}).passthrough().optional()}).passthrough();

const action = createAction({
    description: 'Get campaign UTM settings',
    version: '1.0.0',
    // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
    endpoint: {
        method: 'GET',
        path: '/omnisend/getCampaignsIdUtm',
        group: 'Campaigns'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse(
    (await callOmnisend(nango, 'GET', '/campaigns/{id}/utm', requestInput as Record<string, unknown>)).data
    )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
