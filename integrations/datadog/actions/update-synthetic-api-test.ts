import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    public_id: z.string().trim().min(1).describe('The public ID of the Synthetic API test to update. Example: "abc-def-123"'),
    name: z.string().optional().describe('New name for the test.'),
    message: z.string().optional().describe('New notification message for the test.'),
    status: z.enum(['live', 'paused']).optional().describe('Whether to start or pause the test.'),
    tags: z.array(z.string()).optional().describe('New array of tags attached to the test.'),
    locations: z.array(z.string()).optional().describe('New array of locations used to run the test.'),
    config: z.record(z.string(), z.unknown()).optional().describe('New configuration object for the test.'),
    options: z.record(z.string(), z.unknown()).optional().describe('New options object for the test.'),
    subtype: z.string().optional().describe('New subtype for the test.')
});

const SyntheticsAPITestSchema = z
    .object({
        config: z.record(z.string(), z.unknown()),
        locations: z.array(z.string()),
        message: z.string(),
        monitor_id: z.number().optional(),
        name: z.string(),
        options: z.record(z.string(), z.unknown()),
        public_id: z.string().optional(),
        status: z.string().optional(),
        subtype: z.string().optional(),
        tags: z.array(z.string()).optional(),
        type: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    public_id: z.string(),
    name: z.string(),
    type: z.string(),
    status: z.string().optional(),
    subtype: z.string().optional(),
    message: z.string().optional(),
    tags: z.array(z.string()).optional(),
    locations: z.array(z.string()).optional(),
    monitor_id: z.number().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    options: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Edit an existing Synthetic API test configuration.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['synthetics_read', 'synthetics_write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const getConfig: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/synthetics/#get-an-api-test
            endpoint: `v1/synthetics/tests/api/${encodeURIComponent(input.public_id)}`,
            retries: 3
        };

        const getResponse = await nango.get(getConfig);
        const currentTest = SyntheticsAPITestSchema.parse(getResponse.data);

        const updateBody = {
            type: currentTest.type,
            name: currentTest.name,
            config: currentTest.config,
            locations: currentTest.locations,
            options: currentTest.options,
            message: currentTest.message,
            ...(currentTest.status !== undefined && { status: currentTest.status }),
            ...(currentTest.subtype !== undefined && { subtype: currentTest.subtype }),
            ...(currentTest.tags !== undefined && { tags: currentTest.tags }),
            ...(input.name !== undefined && { name: input.name }),
            ...(input.message !== undefined && { message: input.message }),
            ...(input.status !== undefined && { status: input.status }),
            ...(input.tags !== undefined && { tags: input.tags }),
            ...(input.locations !== undefined && { locations: input.locations }),
            ...(input.config !== undefined && { config: input.config }),
            ...(input.options !== undefined && { options: input.options }),
            ...(input.subtype !== undefined && { subtype: input.subtype })
        };

        const putConfig: ProxyConfiguration = {
            // https://docs.datadoghq.com/api/latest/synthetics/#edit-an-api-test
            endpoint: `v1/synthetics/tests/api/${encodeURIComponent(input.public_id)}`,
            data: updateBody,
            retries: 3
        };

        const putResponse = await nango.put(putConfig);
        const updatedTest = SyntheticsAPITestSchema.parse(putResponse.data);

        return {
            public_id: updatedTest.public_id ?? input.public_id,
            name: updatedTest.name,
            type: updatedTest.type,
            ...(updatedTest.status !== undefined && { status: updatedTest.status }),
            ...(updatedTest.subtype !== undefined && { subtype: updatedTest.subtype }),
            ...(updatedTest.message !== undefined && { message: updatedTest.message }),
            ...(updatedTest.tags !== undefined && { tags: updatedTest.tags }),
            ...(updatedTest.locations !== undefined && { locations: updatedTest.locations }),
            ...(updatedTest.monitor_id !== undefined && { monitor_id: updatedTest.monitor_id }),
            ...(typeof updatedTest.config === 'object' && updatedTest.config !== null && { config: updatedTest.config }),
            ...(typeof updatedTest.options === 'object' && updatedTest.options !== null && { options: updatedTest.options })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
