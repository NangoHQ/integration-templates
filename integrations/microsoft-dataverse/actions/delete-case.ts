import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        incidentid: z.string().describe('The unique identifier (GUID) of the case to delete. Example: "a0eac542-7f53-ef11-b8e9-000d3a5bb1d0"')
    })
    .describe('Identifies the case (incident) record to delete.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('Whether the case was successfully deleted. A successful delete returns true.')
    })
    .describe('Result of the case deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a case (incident) record from Dataverse; the mutation cannot be undone.
 * @pitfalls: Deletion is immediate and irreversible with no recycle bin via the Web API. Deleting an unknown or already-deleted id fails with a 404 error instead of succeeding as a no-op.
 */
const action = createAction({
    description: 'Delete a case',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/update-delete-entities-using-web-api#basic-delete
            endpoint: `/api/data/v9.2/incidents(${encodeURIComponent(input.incidentid)})`,
            // Deleting the same case twice returns a 404 (the record is already gone), so retrying a lost response would surface a spurious failure.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        };
        await nango.delete(config);

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
