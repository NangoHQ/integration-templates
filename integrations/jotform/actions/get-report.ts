import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        report_id: z.string().describe('ID of the report to retrieve. Example: "262735952083059"')
    })
    .describe('Parameters for fetching a single report.');

const ProviderReportSchema = z.object({
    id: z.string(),
    form_id: z.string(),
    title: z.string(),
    list_type: z.string(),
    status: z.string(),
    url: z.string(),
    fields: z.string().optional(),
    settings: z.string().nullable().optional(),
    password: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    isProtected: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    content: z.union([ProviderReportSchema, z.string(), z.null()]).optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Report ID. Example: "262735952083059"'),
        form_id: z.string().describe('ID of the form the report belongs to. Example: "262715780901055"'),
        title: z.string().describe('Title of the report.'),
        list_type: z.string().describe('Report output format, e.g. "csv", "excel", "html", "pdf", "rss", "calendar", or "table".'),
        status: z.string().describe('Status of the report, e.g. "ENABLED".'),
        url: z.string().describe('Direct URL of the report.'),
        fields: z.string().optional().describe('Comma-separated list of question and pseudo-field IDs included in the report. Example: "dt,ip"'),
        settings: z.string().optional().describe('Report type-specific settings, as returned by Jotform.'),
        password: z.string().optional().describe('Report password. Empty string when the report is not password-protected.'),
        created_at: z.string().optional().describe('Creation timestamp in "YYYY-MM-DD HH:mm:ss" format.'),
        updated_at: z.string().optional().describe('Last update timestamp in "YYYY-MM-DD HH:mm:ss" format. Omitted when the report was never updated.'),
        isProtected: z.boolean().optional().describe('Whether the report is password-protected.')
    })
    .describe('Configuration of a single Jotform report.');

/**
 * @tags: [read]
 * @tagReason: Only fetches a single report's configuration; it never modifies provider state.
 * @pitfalls: An unknown or deleted report ID is rejected with a 401 authorization-style error instead of a 404, so an apparent permissions failure can simply mean the report does not exist.
 */
const action = createAction({
    description: 'Retrieve the configuration of a single report.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.jotform.com/docs/ (GET /report/{id})
        const response = await nango.get({
            endpoint: `/report/${encodeURIComponent(input.report_id)}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const report = parsed.content;

        if (!report || typeof report === 'string') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Report not found',
                report_id: input.report_id
            });
        }

        return {
            id: report.id,
            form_id: report.form_id,
            title: report.title,
            list_type: report.list_type,
            status: report.status,
            url: report.url,
            ...(report.fields != null && { fields: report.fields }),
            ...(report.settings != null && { settings: report.settings }),
            ...(report.password != null && { password: report.password }),
            ...(report.created_at != null && { created_at: report.created_at }),
            ...(report.updated_at != null && { updated_at: report.updated_at }),
            ...(report.isProtected != null && { isProtected: report.isProtected })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
