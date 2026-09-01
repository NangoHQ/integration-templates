import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        company_field_id: z.number().describe('The numeric identifier of the company field to delete.')
    })
    .describe('Input for deleting a company field in Freshdesk.');

const OutputSchema = z.null().describe('Empty success response from deleting a company field.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently removes a company field from the Freshdesk account; the corresponding data across all companies is lost.
 * @pitfalls: Deletion is irreversible and permanently destroys all data stored in this field across every company.
 */
const action = createAction({
    description: 'Delete a company field in Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.freshdesk.com/api/#delete_company_field
        await nango.delete({
            endpoint: `/api/v2/company_fields/${encodeURIComponent(String(input.company_field_id))}`,
            retries: 10
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
