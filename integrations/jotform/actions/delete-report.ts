import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        report_id: z.string().describe('ID of the report to permanently delete. Example: "1234567890". List report IDs with the list-form-reports action.')
    })
    .describe('Input for deleting a Jotform report.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when Jotform confirmed the report was permanently deleted.')
    })
    .describe('Result of deleting a Jotform report.');

const DeleteReportResponseSchema = z.object({
    content: z.boolean().optional()
});

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a report on the provider; the report cannot be recovered afterwards.
 * @pitfalls: Deletion is permanent with no trash or restore for deleted reports. The delete is not safely idempotent: re-deleting an already-deleted or unknown report ID fails with an error instead of a clean success. This action requires the Jotform API key to have Full Access; a Read Access key fails with a 401 authorization error.
 */
const action = createAction({
    description: 'Permanently delete a report.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.jotform.com/docs/ (DELETE /report/{id})
            endpoint: `/report/${encodeURIComponent(input.report_id)}`,
            // Retries disabled: a retry after a lost response would repeat the delete against the already-deleted report.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- retries: 0 is deliberate for this non-idempotent hard delete.
            retries: 0
        };

        const response = await nango.delete(config);
        const parsed = DeleteReportResponseSchema.parse(response.data);

        return { success: parsed.content === true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
