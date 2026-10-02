import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        form_id: z.string().describe('ID of the form to create the report for. Example: "262715780901055"'),
        title: z.string().describe('Title of the new report. Example: "Submissions Export"'),
        list_type: z.string().describe('Type of report to create. Common values: "csv", "excel", "grid", "table". Example: "csv"')
    })
    .describe('Parameters for creating a new report on a form');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the created report.'),
        form_id: z.string().optional().describe('ID of the form the report belongs to.'),
        title: z.string().optional().describe('Title of the report.'),
        list_type: z.string().optional().describe('Type of the report, e.g. "csv".'),
        status: z.string().optional().describe('Status of the report, e.g. "ENABLED".'),
        url: z.string().optional().describe('URL to view the report in Jotform.'),
        fields: z.string().optional().describe('Comma-separated identifiers of the fields included in the report, e.g. "dt,ip".')
    })
    .describe('The created report');

const ReportContentSchema = z.object({
    id: z.union([z.string(), z.number()]),
    form_id: z.union([z.string(), z.number()]).optional(),
    title: z.string().optional(),
    list_type: z.string().optional(),
    status: z.string().optional(),
    url: z.string().optional(),
    fields: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    responseCode: z.number(),
    result: z.string().optional(),
    message: z.string().optional(),
    content: z.unknown()
});

/**
 * @tags: [write]
 * @tagReason: Creates a new report resource on a form in Jotform; no reads and nothing is deleted or invalidated.
 * @pitfalls: Jotform does not deduplicate reports, so each successful call creates a new separate report even with an identical title and type. New reports default to a minimal field set ("dt,ip") rather than the form's questions.
 */
const action = createAction({
    description: 'Create a new report (e.g. a CSV export view) for a form',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Jotform silently ignores title/list_type sent in a request body (fails with "list_type is required"); they must be sent as query string params.
        const config: ProxyConfiguration = {
            // https://api.jotform.com/docs/#form-id-reports
            endpoint: `/form/${encodeURIComponent(input.form_id)}/reports`,
            params: {
                title: input.title,
                list_type: input.list_type
            },
            // Creating a report is not idempotent; a retry after a lost response would create a duplicate report, so retries are disabled.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- retries: 0 is deliberate for this non-idempotent create call
            retries: 0
        };

        const response = await nango.post(config);
        const envelope = ProviderResponseSchema.parse(response.data);

        if (envelope.responseCode !== 200) {
            throw new nango.ActionError({
                type: 'report_creation_failed',
                message: envelope.message ?? 'Jotform failed to create the report',
                response_code: envelope.responseCode
            });
        }

        const report = ReportContentSchema.parse(envelope.content);

        return {
            id: String(report.id),
            ...(report.form_id !== undefined && { form_id: String(report.form_id) }),
            ...(report.title != null && { title: report.title }),
            ...(report.list_type != null && { list_type: report.list_type }),
            ...(report.status != null && { status: report.status }),
            ...(report.url != null && { url: report.url }),
            ...(report.fields != null && { fields: report.fields })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
