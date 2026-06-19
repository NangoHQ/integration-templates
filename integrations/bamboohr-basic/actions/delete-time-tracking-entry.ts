import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    employeeId: z.string().describe('Employee ID. Example: "123"'),
    entryId: z.string().describe('Time tracking entry ID. Example: "456"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Delete a time tracking entry for an employee in BambooHR.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://documentation.bamboohr.com/reference/delete-time-tracking-hour-record
            endpoint: `/v1/timetracking/delete/${encodeURIComponent(input.entryId)}`,
            retries: 3
        };

        const response = await nango.delete(config);

        const ProviderResponseSchema = z.object({
            status: z.string().optional(),
            message: z.string().optional()
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            success: providerResponse.status === 'success'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
