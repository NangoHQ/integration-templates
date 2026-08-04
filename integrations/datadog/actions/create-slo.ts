import { z } from 'zod';
import { createAction } from 'nango';

const ThresholdSchema = z.object({
    timeframe: z.enum(['7d', '30d', '90d']).describe('Time window for the SLO target. Example: "7d"'),
    target: z.number().describe('Target percentage. Example: 99.0')
});

const InputSchema = z.object({
    name: z.string().describe('Name of the SLO. Example: "My Service SLO"'),
    type: z.enum(['metric', 'monitor']).describe('SLO type: metric or monitor. Example: "metric"'),
    query: z.object({
        numerator: z.string().describe('Numerator query. For metric type, must end with .as_count(). Example: "sum:system.cpu.user{*}.as_count()"'),
        denominator: z.string().describe('Denominator query. For metric type, must end with .as_count(). Example: "sum:system.cpu.user{*}.as_count()"')
    }),
    thresholds: z.array(ThresholdSchema).min(1).describe('Thresholds defining the SLO target over time.')
});

const ProviderSloSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    query: z
        .object({
            numerator: z.string().optional(),
            denominator: z.string().optional(),
            monitor_ids: z.array(z.number()).optional()
        })
        .passthrough(),
    thresholds: z.array(
        z
            .object({
                timeframe: z.string(),
                target: z.number(),
                warning: z.number().optional().nullable(),
                target_display: z.string().optional().nullable(),
                warning_display: z.string().optional().nullable()
            })
            .passthrough()
    ),
    created_at: z.number().optional().nullable(),
    modified_at: z.number().optional().nullable(),
    description: z.string().optional().nullable(),
    tags: z.array(z.string()).optional().nullable(),
    creator: z
        .object({
            name: z.string().optional().nullable(),
            handle: z.string().optional().nullable(),
            email: z.string().optional().nullable()
        })
        .optional()
        .nullable()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderSloSchema),
    errors: z.array(z.string()).optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    query: z
        .object({
            numerator: z.string().optional(),
            denominator: z.string().optional(),
            monitor_ids: z.array(z.number()).optional()
        })
        .passthrough(),
    thresholds: z.array(
        z
            .object({
                timeframe: z.string(),
                target: z.number(),
                warning: z.number().optional(),
                target_display: z.string().optional(),
                warning_display: z.string().optional()
            })
            .passthrough()
    ),
    created_at: z.number().optional(),
    modified_at: z.number().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    creator: z
        .object({
            name: z.string().optional(),
            handle: z.string().optional(),
            email: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a new metric-based or monitor-based Service Level Objective.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.type === 'metric') {
            const asCountRegex = /\.as_count\(\)$/;
            if (!asCountRegex.test(input.query.numerator)) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'Metric queries require the "as_count()" modifier on the numerator query.'
                });
            }
            if (!asCountRegex.test(input.query.denominator)) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'Metric queries require the "as_count()" modifier on the denominator query.'
                });
            }
        }

        // https://docs.datadoghq.com/api/latest/service-level-objectives/#create-an-slo-object
        const response = await nango.post({
            endpoint: 'v1/slo',
            data: {
                name: input.name,
                type: input.type,
                query: input.query,
                thresholds: input.thresholds
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from Datadog API',
                details: parsed.error.issues
            });
        }

        const providerData = parsed.data;

        if (providerData.errors && providerData.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerData.errors.join(', ')
            });
        }

        if (!providerData.data || providerData.data.length === 0) {
            throw new nango.ActionError({
                type: 'no_data',
                message: 'No SLO data returned from Datadog API'
            });
        }

        const slo = providerData.data[0];
        if (!slo) {
            throw new nango.ActionError({
                type: 'no_data',
                message: 'No SLO data returned from Datadog API'
            });
        }

        return {
            id: slo.id,
            name: slo.name,
            type: slo.type,
            query: slo.query,
            thresholds: slo.thresholds.map((t) => ({
                timeframe: t.timeframe,
                target: t.target,
                ...(t.warning != null && { warning: t.warning }),
                ...(t.target_display != null && { target_display: t.target_display }),
                ...(t.warning_display != null && { warning_display: t.warning_display })
            })),
            ...(slo.created_at != null && { created_at: slo.created_at }),
            ...(slo.modified_at != null && { modified_at: slo.modified_at }),
            ...(slo.description != null && { description: slo.description }),
            ...(slo.tags != null && { tags: slo.tags }),
            ...(slo.creator != null && {
                creator: {
                    ...(slo.creator.name != null && { name: slo.creator.name }),
                    ...(slo.creator.handle != null && { handle: slo.creator.handle }),
                    ...(slo.creator.email != null && { email: slo.creator.email })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
