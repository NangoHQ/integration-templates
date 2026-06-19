import { z } from 'zod';
import { createAction } from 'nango';

const LastChangedFilterSchema = z.object({
    value: z.string().describe('ISO 8601 date-time to filter employees by last-modified date. Example: "2024-01-01T00:00:00Z"'),
    includeNull: z.enum(['yes', 'no']).optional().describe('Whether to include employees with no last-changed date.')
});

const FiltersSchema = z.object({
    lastChanged: LastChangedFilterSchema.optional(),
    employeeIds: z.array(z.string()).optional().describe('Restrict results to specific employee IDs.'),
    filterDuplicates: z.enum(['yes', 'no']).optional().describe('Whether to apply standard duplicate row filtering. Defaults to enabled.')
});

const InputSchema = z.object({
    title: z.string().optional().describe('A label for the report. Included in the response and used as the file name for downloaded reports.'),
    fields: z.array(z.string()).max(400).describe('Array of field IDs to include as columns in the report. Maximum of 400 fields.'),
    onlyCurrent: z.boolean().optional().describe('Whether to restrict historical fields to current values only. Defaults to true.'),
    filters: FiltersSchema.optional()
});

const ReportFieldSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string()
});

const ReportEmployeeSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    title: z.string(),
    fields: z.array(ReportFieldSchema),
    employees: z.array(ReportEmployeeSchema)
});

const action = createAction({
    description: 'Run a BambooHR custom company report.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: { title?: string; fields: string[]; filters?: z.infer<typeof FiltersSchema> } = {
            fields: input.fields
        };

        if (input.title !== undefined) {
            requestBody.title = input.title;
        }

        if (input.filters !== undefined) {
            requestBody.filters = input.filters;
        }

        const response = await nango.post({
            // https://documentation.bamboohr.com/reference/request-custom-report
            endpoint: '/v1/reports/custom',
            params: {
                format: 'JSON',
                ...(input.onlyCurrent !== undefined && { onlyCurrent: String(input.onlyCurrent) })
            },
            data: requestBody,
            retries: 3
        });

        const providerReport = OutputSchema.parse(response.data);

        return {
            title: providerReport.title,
            fields: providerReport.fields,
            employees: providerReport.employees
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
