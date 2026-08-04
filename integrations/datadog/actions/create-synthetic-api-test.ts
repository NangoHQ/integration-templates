import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const AssertionSchema = z.object({
    type: z.string(),
    operator: z.string(),
    target: z.union([z.number(), z.string()])
});

const InputSchema = z.object({
    name: z.string().describe('Name of the synthetic test. Example: "Nango Registry Test Synthetic"'),
    request_method: z.string().optional().describe('HTTP method for the test request. Example: "GET"'),
    request_url: z.string().describe('URL to test. Example: "https://example.com"'),
    locations: z.array(z.string()).optional().describe('Locations to run the test from. Example: ["aws:us-east-1"]'),
    tick_every: z.number().optional().describe('Frequency in seconds. Example: 900'),
    message: z.string().describe('Notification message. Example: "Test failed"'),
    status: z.enum(['paused', 'live']).optional().describe('Test status. Example: "paused"'),
    assertions: z.array(AssertionSchema).optional().describe('List of assertions to validate the response.')
});

const OutputSchema = z.object({
    public_id: z.string(),
    name: z.string(),
    type: z.string(),
    subtype: z.string(),
    status: z.string(),
    created_at: z.string().optional(),
    modified_at: z.string().optional()
});

const action = createAction({
    description: 'Create a new Synthetic API (HTTP) test',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['synthetics_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestMethod = input.request_method ?? 'GET';
        const locations = input.locations ?? ['aws:us-east-1'];
        const tickEvery = input.tick_every ?? 900;
        const status = input.status ?? 'paused';
        const assertions = input.assertions ?? [{ type: 'statusCode', operator: 'is', target: 200 }];

        const config: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/synthetics/#create-an-api-test
            endpoint: 'v1/synthetics/tests/api',
            data: {
                name: input.name,
                type: 'api',
                subtype: 'http',
                config: {
                    request: {
                        method: requestMethod,
                        url: input.request_url
                    },
                    assertions
                },
                locations,
                options: {
                    tick_every: tickEvery
                },
                message: input.message,
                status
            },
            retries: 3
        };

        const response = await nango.post(config);

        const providerTest = z
            .object({
                public_id: z.string(),
                name: z.string(),
                type: z.string(),
                subtype: z.string(),
                status: z.string(),
                created_at: z.string().optional(),
                modified_at: z.string().optional()
            })
            .parse(response.data);

        return {
            public_id: providerTest.public_id,
            name: providerTest.name,
            type: providerTest.type,
            subtype: providerTest.subtype,
            status: providerTest.status,
            ...(providerTest.created_at !== undefined && { created_at: providerTest.created_at }),
            ...(providerTest.modified_at !== undefined && { modified_at: providerTest.modified_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
