import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    applicationId: z.string().describe('The id of the application to update the source of. Example: "3ae2b801-19f6-41ef-ad28-214bd731948f"'),
    sourceId: z
        .string()
        .nullable()
        .describe('The source to set on the application. Pass null to unset an application\'s source. Example: "2c6991c5-c9e2-4af8-879e-29c5a9d26509"')
});

const ProviderApplicationSchema = z.object({
    id: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    status: z.string(),
    candidate: z.object({
        id: z.string(),
        name: z.string()
    }),
    currentInterviewStage: z.object({
        id: z.string(),
        title: z.string()
    }),
    job: z.object({
        id: z.string(),
        title: z.string()
    }),
    source: z
        .object({
            id: z.string(),
            title: z.string()
        })
        .nullable()
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    candidate: z.object({
        id: z.string(),
        name: z.string().optional()
    }),
    currentInterviewStage: z
        .object({
            id: z.string(),
            title: z.string().optional()
        })
        .optional(),
    job: z.object({
        id: z.string(),
        title: z.string().optional()
    }),
    source: z
        .object({
            id: z.string(),
            title: z.string().optional()
        })
        .nullable()
        .optional()
});

const EnvelopeSchema = z.object({
    success: z.boolean(),
    results: z.unknown().optional(),
    errorInfo: z
        .object({
            code: z.string(),
            message: z.string().optional()
        })
        .optional(),
    errors: z.array(z.string()).optional(),
    warnings: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Update an application source.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/change-application-source',
        group: 'Applications'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['candidatesWrite'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.ashbyhq.com/reference/applicationchangesource
            endpoint: '/application.changeSource',
            data: {
                applicationId: input.applicationId,
                sourceId: input.sourceId
            },
            retries: 3
        });

        const envelope = EnvelopeSchema.parse(response.data);

        if (!envelope.success) {
            throw new nango.ActionError({
                type: envelope.errorInfo?.code || envelope.errors?.[0] || 'api_error',
                message: envelope.errorInfo?.message || envelope.errors?.join(', ') || 'Ashby API returned an error'
            });
        }

        if (envelope.results === undefined) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Missing results in Ashby API response'
            });
        }

        const providerApplication = ProviderApplicationSchema.parse(envelope.results);

        return {
            id: providerApplication.id,
            status: providerApplication.status,
            createdAt: providerApplication.createdAt,
            updatedAt: providerApplication.updatedAt,
            candidate: {
                id: providerApplication.candidate.id,
                name: providerApplication.candidate.name
            },
            currentInterviewStage: {
                id: providerApplication.currentInterviewStage.id,
                title: providerApplication.currentInterviewStage.title
            },
            job: {
                id: providerApplication.job.id,
                title: providerApplication.job.title
            },
            ...(providerApplication.source !== undefined && {
                source:
                    providerApplication.source === null
                        ? null
                        : {
                              id: providerApplication.source.id,
                              title: providerApplication.source.title
                          }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
