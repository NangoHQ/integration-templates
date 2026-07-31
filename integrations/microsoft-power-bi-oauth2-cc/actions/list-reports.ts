import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    groupId: z.string().describe('Workspace (group) ID. Example: "149ca924-4333-471b-94b5-347eca3f9938"')
});

const ProviderReportSchema = z.object({
    id: z.string(),
    reportType: z.string().optional(),
    name: z.string(),
    webUrl: z.string().optional(),
    embedUrl: z.string().optional(),
    isFromPbix: z.boolean().optional(),
    isOwnedByMe: z.boolean().optional(),
    datasetId: z.string().optional()
});

const ProviderListResponseSchema = z.object({
    value: z.array(ProviderReportSchema)
});

const ReportSchema = z.object({
    id: z.string(),
    reportType: z.string().optional(),
    name: z.string(),
    webUrl: z.string().optional(),
    embedUrl: z.string().optional(),
    isFromPbix: z.boolean().optional(),
    isOwnedByMe: z.boolean().optional(),
    datasetId: z.string().optional()
});

const OutputSchema = z.object({
    reports: z.array(ReportSchema)
});

const action = createAction({
    description: 'List reports in a workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Report.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/rest/api/power-bi/reports/get-reports-in-group
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.groupId)}/reports`,
            retries: 3
        });

        const parsed = ProviderListResponseSchema.parse(response.data);

        return {
            reports: parsed.value.map((report) => ({
                id: report.id,
                ...(report.reportType !== undefined && { reportType: report.reportType }),
                name: report.name,
                ...(report.webUrl !== undefined && { webUrl: report.webUrl }),
                ...(report.embedUrl !== undefined && { embedUrl: report.embedUrl }),
                ...(report.isFromPbix !== undefined && { isFromPbix: report.isFromPbix }),
                ...(report.isOwnedByMe !== undefined && { isOwnedByMe: report.isOwnedByMe }),
                ...(report.datasetId !== undefined && { datasetId: report.datasetId })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
