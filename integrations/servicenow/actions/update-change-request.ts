import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('The sys_id of the change request to update. Example: "ff3687b9c3ca0310c5a8fc0d05013101"'),
    fields: z.record(z.string(), z.unknown()).describe('Fields to update on the change request. Example: { "short_description": "Updated description" }')
});

const ProviderResponseSchema = z.object({
    result: z.record(z.string(), z.unknown())
});

const OutputSchema = z.object({
    result: z.record(z.string(), z.unknown()).optional()
});

// ServiceNow journal fields append a new entry on every PATCH rather than overwriting.
// Callers may pass these through the generic `fields` map, so they must be split out and
// sent without automatic retries to avoid duplicating entries on a retried request.
const JOURNAL_FIELD_NAMES = new Set(['comments', 'work_notes']);

const action = createAction({
    description: 'Update change request fields.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const endpoint = `/api/now/table/change_request/${encodeURIComponent(input.sys_id)}`;

        const safeFields: Record<string, unknown> = {};
        const journalFields: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(input.fields)) {
            if (JOURNAL_FIELD_NAMES.has(key)) {
                journalFields[key] = value;
            } else {
                safeFields[key] = value;
            }
        }

        let response;
        // https://developer.servicenow.com/dev.do#!/reference/api/rest/table-api
        if (Object.keys(safeFields).length > 0 || Object.keys(journalFields).length === 0) {
            response = await nango.patch({
                endpoint,
                data: safeFields,
                retries: 1
            });
        }

        if (Object.keys(journalFields).length > 0) {
            response = await nango.patch({
                endpoint,
                data: journalFields,
                // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
                retries: 0
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response?.data);

        return {
            result: providerResponse.result
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
