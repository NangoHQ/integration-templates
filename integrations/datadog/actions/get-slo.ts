import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    slo_id: z.string().trim().min(1).describe('The ID of the SLO to retrieve. Example: "de718b2c100251b8b03b23c74b93e5cd"')
});

const SloThresholdSchema = z.object({
    timeframe: z.string(),
    target: z.number(),
    target_display: z.string().optional(),
    warning: z.number().optional(),
    warning_display: z.string().optional()
});

const SloQuerySchema = z.object({
    denominator: z.string(),
    numerator: z.string()
});

const SloCreatorSchema = z.object({
    name: z.string(),
    handle: z.string(),
    email: z.string()
});

const SloQuerySpecSchema = z.object({
    data_source: z.string(),
    name: z.string(),
    query: z.string()
});

const SloSliSpecificationSchema = z
    .object({
        count: z
            .object({
                queries: z.array(SloQuerySpecSchema),
                good_events_formula: z.object({
                    formula: z.string()
                }),
                total_events_formula: z.object({
                    formula: z.string()
                })
            })
            .optional()
    })
    .optional();

const ProviderSloSchema = z.object({
    id: z.string(),
    name: z.string(),
    tags: z.array(z.string()).optional(),
    monitor_tags: z.array(z.string()).optional(),
    thresholds: z.array(SloThresholdSchema),
    type: z.string(),
    type_id: z.number(),
    description: z.string().optional(),
    timeframe: z.string().optional(),
    target_threshold: z.number().optional(),
    query: SloQuerySchema.optional(),
    creator: SloCreatorSchema.optional(),
    created_at: z.number().optional(),
    modified_at: z.number().optional(),
    sli_specification: SloSliSpecificationSchema
});

const ProviderResponseSchema = z.object({
    data: ProviderSloSchema,
    error: z.union([z.null(), z.array(z.string())]).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    tags: z.array(z.string()).optional(),
    monitor_tags: z.array(z.string()).optional(),
    thresholds: z.array(SloThresholdSchema),
    type: z.string(),
    type_id: z.number(),
    description: z.string().optional(),
    timeframe: z.string().optional(),
    target_threshold: z.number().optional(),
    query: SloQuerySchema.optional(),
    creator: SloCreatorSchema.optional(),
    created_at: z.number().optional(),
    modified_at: z.number().optional(),
    sli_specification: SloSliSpecificationSchema
});

const action = createAction({
    description: 'Get a single SLO by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['slo_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/service-level-objectives/#get-an-slo-s-details
            endpoint: `v1/slo/${encodeURIComponent(input.slo_id)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const slo = providerResponse.data;

        return {
            id: slo.id,
            name: slo.name,
            ...(slo.tags !== undefined && { tags: slo.tags }),
            ...(slo.monitor_tags !== undefined && { monitor_tags: slo.monitor_tags }),
            thresholds: slo.thresholds,
            type: slo.type,
            type_id: slo.type_id,
            ...(slo.description !== undefined && { description: slo.description }),
            ...(slo.timeframe !== undefined && { timeframe: slo.timeframe }),
            ...(slo.target_threshold !== undefined && { target_threshold: slo.target_threshold }),
            ...(slo.query !== undefined && { query: slo.query }),
            ...(slo.creator !== undefined && { creator: slo.creator }),
            ...(slo.created_at !== undefined && { created_at: slo.created_at }),
            ...(slo.modified_at !== undefined && { modified_at: slo.modified_at }),
            ...(slo.sli_specification !== undefined && { sli_specification: slo.sli_specification })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
