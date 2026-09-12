/* Generated from the pinned Omnisend OpenAPI snapshot. */
/* eslint-disable @nangohq/custom-integrations-linting/no-object-casting */
import { createAction } from 'nango';
import * as z from 'zod';
import { callOmnisend } from '../shared.js';

const input = z.object({body: z.object({"contact": z.object({"address": z.string().optional(), "birthdate": z.string().optional(), "city": z.string().optional(), "consents": z.array(z.unknown()).optional(), "country": z.string().optional(), "countryCode": z.string().optional(), "customProperties": z.record(z.string(), z.unknown()).optional(), "email": z.string().optional(), "firstName": z.string().optional(), "gender": z.enum(["m", "f"]).optional(), "id": z.string().optional(), "lastName": z.string().optional(), "optIns": z.array(z.unknown()).optional(), "optOuts": z.array(z.unknown()).optional(), "phone": z.string().optional(), "postalCode": z.string().optional(), "state": z.string().optional(), "tags": z.array(z.unknown()).optional()}).passthrough().optional(), "eventID": z.string().optional(), "eventName": z.string().optional(), "eventTime": z.string().optional(), "eventVersion": z.string().optional(), "origin": z.string().optional(), "properties": z.record(z.string(), z.unknown()).optional()}).passthrough()}).passthrough();
const output = z.unknown();

const action = createAction({
    description: 'Send Customer event',
    version: '1.0.0',
    // Omnisend API docs: https://api-docs.omnisend.com/v2026-03-15/reference/
    endpoint: {
        method: 'POST',
        path: '/omnisend/postEvents',
        group: 'Events'
    },
    input,
    output,
    exec: async (nango, requestInput) => output.parse(
    (await callOmnisend(nango, 'POST', '/events', requestInput as Record<string, unknown>)).data
    )
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
