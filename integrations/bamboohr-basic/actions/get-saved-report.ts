import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    reportId: z.number().describe('The numeric ID of the saved custom report to execute. Example: 42')
});

const ProviderFieldSchema = z.object({
    id: z.coerce.string(),
    type: z.string().optional(),
    name: z.string().optional()
});

const ProviderResponseSchema = z.object({
    title: z.string().optional(),
    fields: z.array(ProviderFieldSchema).optional(),
    employees: z.array(z.record(z.string(), z.unknown())).optional()
});

const OutputSchema = z.object({
    title: z.string().optional(),
    fields: z.array(ProviderFieldSchema).optional(),
    rows: z.array(z.record(z.string(), z.unknown())).optional()
});

const action = createAction({
    description: 'Run a saved BambooHR report by ID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-saved-report',
        group: 'Reports'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://documentation.bamboohr.com/reference/get-company-report
            endpoint: `/v1/reports/${encodeURIComponent(String(input.reportId))}`,
            params: {
                format: 'JSON'
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerData.title !== undefined && { title: providerData.title }),
            ...(providerData.fields !== undefined && { fields: providerData.fields }),
            ...(providerData.employees !== undefined && { rows: providerData.employees })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
