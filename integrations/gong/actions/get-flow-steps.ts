import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    flowIds: z.array(z.string()).describe('One or more Gong Engage flow IDs. Example: ["1695493301223590792"]')
});

const StepSchema = z
    .object({
        number: z.number().optional(),
        type: z.string().optional(),
        name: z.string().optional(),
        delayInDays: z.number().optional(),
        subject: z.string().optional(),
        body: z.string().optional(),
        replyToPrevious: z.boolean().optional(),
        sendAsNewThread: z.boolean().optional()
    })
    .passthrough();

const FlowDetailsSchema = z
    .object({
        id: z.string().optional(),
        name: z.string().optional(),
        folderId: z.string().optional(),
        folderName: z.string().optional(),
        visibility: z.string().optional(),
        creationDate: z.string().optional(),
        exclusive: z.boolean().optional(),
        steps: z.array(StepSchema).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    requestId: z.string().optional(),
    flows: z.array(FlowDetailsSchema).optional()
});

const action = createAction({
    description: 'Retrieve details and steps for one or more Gong Engage flows.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-flow-steps',
        group: 'Flows'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:flows:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.flowIds || input.flowIds.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'flowIds must contain at least one flow ID.'
            });
        }

        // https://help.gong.io/docs/gong-engage-api-capabilities
        // @allowTryCatch The real Gong API throws on 404 when a flowId does not exist.
        // The mock framework returns the 404 as a normal response, so the try block
        // handles the mock case; this catch handles the live API case.
        try {
            const response = await nango.post({
                endpoint: '/v2/flows/steps',
                data: {
                    flowIds: input.flowIds
                },
                retries: 3
            });

            const errorResponseSchema = z
                .object({
                    errors: z.array(z.string())
                })
                .passthrough();
            const errorParse = errorResponseSchema.safeParse(response.data);
            if (response.status === 404 || (errorParse.success && errorParse.data.errors.some((m) => m.includes('Flow not found')))) {
                return {
                    flows: []
                };
            }

            const parsed = OutputSchema.parse(response.data);
            return parsed;
        } catch (error) {
            const errorObj = typeof error === 'object' && error !== null ? error : undefined;
            const status = errorObj && 'status' in errorObj && typeof errorObj.status === 'number' ? errorObj.status : undefined;
            if (status === 404) {
                return {
                    flows: []
                };
            }
            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
