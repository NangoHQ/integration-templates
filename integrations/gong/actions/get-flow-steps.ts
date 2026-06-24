import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    flowIds: z.array(z.string()).describe('One or more Gong Engage flow IDs. Example: ["1695493301223590792"]')
});

const StepSchema = z
    .object({
        number: z.number().nullish(),
        type: z.string().nullish(),
        name: z.string().nullish(),
        delayInDays: z.number().nullish(),
        subject: z.string().nullish(),
        body: z.string().nullish(),
        replyToPrevious: z.boolean().nullish(),
        sendAsNewThread: z.boolean().nullish()
    })
    .passthrough();

const FlowDetailsSchema = z
    .object({
        id: z.string().nullish(),
        name: z.string().nullish(),
        folderId: z.string().nullish(),
        folderName: z.string().nullish(),
        visibility: z.string().nullish(),
        creationDate: z.string().nullish(),
        exclusive: z.boolean().nullish(),
        steps: z.array(StepSchema).nullish()
    })
    .passthrough();

const OutputSchema = z.object({
    requestId: z.string().optional(),
    flows: z.array(FlowDetailsSchema).nullish()
});

const AxiosErrorSchema = z.object({
    response: z.object({ status: z.number(), data: z.unknown().optional() }).optional(),
    status: z.number().optional()
});

const action = createAction({
    description: 'Retrieve details and steps for one or more Gong Engage flows.',
    version: '1.0.2',
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
            const parsedErr = AxiosErrorSchema.safeParse(error);
            const status = parsedErr.success ? (parsedErr.data.response?.status ?? parsedErr.data.status) : undefined;
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
