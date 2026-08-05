import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    taskId: z.string().describe('The task ID returned by create-mock-anything. Example: "444e0bee-a1a8-4bfa-a312-5f0eae1602d3"')
});

const SmartObjectSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    size: z.object({ width: z.number(), height: z.number() }).optional(),
    position: z.object({ top: z.number(), left: z.number() }).optional(),
    print_area_presets: z.array(z.unknown()).optional(),
    decoration: z.object({ location: z.string(), name: z.string() }).optional()
});

const UnrenderedDecorationSchema = z.object({
    location: z.string(),
    reason: z.string()
});

const MockupSchema = z
    .object({
        type: z.string().optional(),
        uuid: z.string(),
        name: z.string(),
        thumbnail: z.string().optional(),
        smart_objects: z.array(SmartObjectSchema).optional(),
        text_layers: z.array(z.unknown()).optional(),
        collections: z.array(z.unknown()).optional(),
        thumbnails: z.array(z.unknown()).optional(),
        products: z.array(z.unknown()).optional(),
        unrendered_decorations: z.array(UnrenderedDecorationSchema).optional()
    })
    .passthrough();

const ProviderInnerDataSchema = z
    .object({
        task_id: z.string().optional(),
        state: z.enum(['PENDING', 'PROGRESS', 'SUCCESS', 'FAILURE']),
        status: z.string().optional(),
        image_url: z.string().nullable().optional(),
        selected_size: z.string().nullable().optional(),
        aspect_ratio: z.string().nullable().optional(),
        mockup: z.union([MockupSchema, z.null()]).optional(),
        warnings: z.array(z.unknown()).optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    data: ProviderInnerDataSchema,
    success: z.boolean(),
    message: z.string()
});

const OutputSchema = z
    .object({
        state: z.enum(['PENDING', 'PROGRESS', 'SUCCESS', 'FAILURE']),
        status: z.string().optional(),
        image_url: z.string().optional(),
        mockup: MockupSchema.optional(),
        selected_size: z.string().optional(),
        aspect_ratio: z.string().optional()
    })
    .passthrough();

const POLL_DELAY_MS = 2000;
const MAX_ATTEMPTS = 2;

const action = createAction({
    description: 'Poll the status of an async MockAnything AI mockup-creation task.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const taskId = encodeURIComponent(input.taskId);
        let lastState: z.infer<typeof ProviderInnerDataSchema> | undefined;

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            const config: ProxyConfiguration = {
                // https://docs.dynamicmockups.com/
                endpoint: `/v1/mock-anything/status/${taskId}`,
                retries: 3
            };

            const response = await nango.get(config);

            const wrapperParsed = ProviderResponseSchema.safeParse(response.data);
            if (!wrapperParsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Provider returned an unexpected response shape',
                    details: wrapperParsed.error.message
                });
            }

            const inner = wrapperParsed.data.data;
            lastState = inner;

            if (inner.state === 'SUCCESS' || inner.state === 'FAILURE') {
                return {
                    state: inner.state,
                    ...(inner.status !== undefined && { status: inner.status }),
                    ...(inner.image_url !== null && inner.image_url !== undefined && { image_url: inner.image_url }),
                    ...(inner.mockup !== null && inner.mockup !== undefined && { mockup: inner.mockup }),
                    ...(inner.selected_size !== null && inner.selected_size !== undefined && { selected_size: inner.selected_size }),
                    ...(inner.aspect_ratio !== null && inner.aspect_ratio !== undefined && { aspect_ratio: inner.aspect_ratio })
                };
            }

            if (attempt < MAX_ATTEMPTS - 1) {
                await new Promise((resolve) => {
                    setTimeout(resolve, POLL_DELAY_MS);
                });
            }
        }

        if (lastState === undefined) {
            throw new nango.ActionError({
                type: 'unexpected',
                message: 'No status response was received during polling'
            });
        }

        return {
            state: lastState.state,
            ...(lastState.status !== undefined && { status: lastState.status }),
            ...(lastState.image_url !== null && lastState.image_url !== undefined && { image_url: lastState.image_url }),
            ...(lastState.mockup !== null && lastState.mockup !== undefined && { mockup: lastState.mockup }),
            ...(lastState.selected_size !== null && lastState.selected_size !== undefined && { selected_size: lastState.selected_size }),
            ...(lastState.aspect_ratio !== null && lastState.aspect_ratio !== undefined && { aspect_ratio: lastState.aspect_ratio })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
