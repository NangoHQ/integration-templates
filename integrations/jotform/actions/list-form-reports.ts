import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        form_id: z.string().describe('ID of the form whose reports should be listed. Example: "262715780901055"')
    })
    .describe('Input for listing the reports configured on a Jotform form.');

const ReportSchema = z.object({
    id: z.string().describe('Unique ID of the report. Example: "262735952083059"'),
    form_id: z.string().optional().describe('ID of the form the report belongs to.'),
    title: z.string().optional().describe('Title of the report.'),
    list_type: z.string().optional().describe('Report format or view type, e.g. "csv", "excel", "grid", "table", "calendar" or "rss".'),
    fields: z.string().optional().describe('Comma-separated identifiers of the submission fields included in the report, e.g. "dt,ip,3,4".'),
    status: z.string().optional().describe('Status of the report, e.g. "ENABLED".'),
    url: z.string().optional().describe('Public share URL where the report can be viewed or downloaded.'),
    isProtected: z.boolean().optional().describe('Whether the report URL is password protected.'),
    created_at: z.string().optional().describe('Creation timestamp in "YYYY-MM-DD HH:mm:ss" format. Omitted when the provider returns no creation date.'),
    updated_at: z.string().optional().describe('Last update timestamp in "YYYY-MM-DD HH:mm:ss" format. Omitted when the report was never updated.')
});

const OutputSchema = z
    .object({
        reports: z.array(ReportSchema).describe('Reports configured for the form; empty when the form has no reports.')
    })
    .describe('List of reports configured on the form.');

const ProviderReportSchema = z.object({
    id: z.string(),
    form_id: z.string().optional(),
    title: z.string().optional(),
    list_type: z.string().optional(),
    fields: z.string().optional(),
    status: z.string().optional(),
    url: z.string().optional(),
    isProtected: z.boolean().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    content: z.array(ProviderReportSchema)
});

/**
 * @tags: [read]
 * @tagReason: Only lists the reports configured for a form via a single GET request; performs no provider mutations.
 * @pitfalls: Returns report configurations (title, type, included fields, share URL), not the report contents; fetch a report's url separately to view or download the actual export.
 */
const action = createAction({
    description: 'List reports (e.g. CSV/grid/table exports or views) configured for a form.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.jotform.com/docs/ (GET /form/{id}/reports - "List reports for a form")
        const response = await nango.get({
            endpoint: `/form/${encodeURIComponent(input.form_id)}/reports`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            reports: parsed.content.map((report) => ({
                id: report.id,
                ...(report.form_id !== undefined && { form_id: report.form_id }),
                ...(report.title !== undefined && { title: report.title }),
                ...(report.list_type !== undefined && { list_type: report.list_type }),
                ...(report.fields !== undefined && { fields: report.fields }),
                ...(report.status !== undefined && { status: report.status }),
                ...(report.url !== undefined && { url: report.url }),
                ...(report.isProtected !== undefined && { isProtected: report.isProtected }),
                ...(report.created_at != null && { created_at: report.created_at }),
                ...(report.updated_at != null && { updated_at: report.updated_at })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
