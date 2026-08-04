import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    rfi_id: z.string().describe('The RFI ID to which the solution belongs. Example: "6a71df9dcb6ddf6b370e0a6f"'),
    text: z.string().describe('The text content of the RFI solution.'),
    is_official: z.boolean().describe('Whether this solution is the official response.'),
    cost_impact: z.enum(['yes', 'no', 'tbd']).describe('Cost impact of the solution. One of: yes, no, tbd.'),
    schedule_impact: z.enum(['yes', 'no', 'tbd']).describe('Schedule impact of the solution. One of: yes, no, tbd.'),
    cost_impact_value: z.number().optional().describe('Monetary value of the cost impact. Required when cost_impact is "yes".'),
    schedule_impact_value: z.number().int().optional().describe('Number of days/weeks of schedule impact. Required when schedule_impact is "yes".'),
    schedule_impact_type: z
        .enum(['days', 'weeks', 'tbd'])
        .optional()
        .describe('Unit of the schedule impact value. One of: days, weeks, tbd. Required when schedule_impact_value is provided.'),
    document_ids: z.array(z.string()).optional().describe('Uploaded document IDs to attach to the solution.')
});

const CreateResponseSchema = z.object({
    id: z.string()
});

const ProviderRfiSolutionSchema = z.object({
    id: z.string(),
    text: z.string(),
    is_official: z.boolean(),
    cost_impact: z.enum(['yes', 'no', 'tbd']),
    cost_impact_value: z.number().nullable().optional(),
    schedule_impact: z.enum(['yes', 'no', 'tbd']),
    schedule_impact_value: z.number().int().nullable().optional(),
    schedule_impact_type: z.enum(['days', 'weeks', 'tbd']).nullable().optional(),
    created_at: z.string().optional(),
    created_by: z.string().optional(),
    updated_at: z.string().optional(),
    updated_by: z.string().optional(),
    document_ids: z.array(z.string()).optional(),
    source_platform: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    text: z.string(),
    is_official: z.boolean(),
    cost_impact: z.enum(['yes', 'no', 'tbd']),
    cost_impact_value: z.number().optional(),
    schedule_impact: z.enum(['yes', 'no', 'tbd']),
    schedule_impact_value: z.number().int().optional(),
    schedule_impact_type: z.enum(['days', 'weeks', 'tbd']).optional(),
    created_at: z.string().optional(),
    created_by: z.string().optional(),
    updated_at: z.string().optional(),
    updated_by: z.string().optional(),
    document_ids: z.array(z.string()).optional(),
    source_platform: z.string().optional()
});

const action = createAction({
    description: 'Add a proposed solution/answer to an RFI.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const createResponse = await nango.post({
            // https://api.ingenious.build/reference/v2-create-rfi-solution.md
            endpoint: '/api/v2/pub/rfi-solutions',
            data: {
                rfi_id: input.rfi_id,
                text: input.text,
                is_official: input.is_official,
                cost_impact: input.cost_impact,
                schedule_impact: input.schedule_impact,
                ...(input.cost_impact_value !== undefined && { cost_impact_value: input.cost_impact_value }),
                ...(input.schedule_impact_value !== undefined && { schedule_impact_value: input.schedule_impact_value }),
                ...(input.schedule_impact_type !== undefined && { schedule_impact_type: input.schedule_impact_type }),
                ...(input.document_ids !== undefined && { document_ids: input.document_ids })
            },
            retries: 1
        });

        const created = CreateResponseSchema.parse(createResponse.data);

        const getResponse = await nango.get({
            // https://api.ingenious.build/reference/v2-get-rfi-solution.md
            endpoint: `/api/v2/pub/rfi-solutions/${encodeURIComponent(created.id)}`,
            retries: 3
        });

        const providerSolution = ProviderRfiSolutionSchema.parse(getResponse.data);

        return {
            id: providerSolution.id,
            text: providerSolution.text,
            is_official: providerSolution.is_official,
            cost_impact: providerSolution.cost_impact,
            ...(providerSolution.cost_impact_value != null && { cost_impact_value: providerSolution.cost_impact_value }),
            schedule_impact: providerSolution.schedule_impact,
            ...(providerSolution.schedule_impact_value != null && { schedule_impact_value: providerSolution.schedule_impact_value }),
            ...(providerSolution.schedule_impact_type != null && { schedule_impact_type: providerSolution.schedule_impact_type }),
            ...(providerSolution.created_at !== undefined && { created_at: providerSolution.created_at }),
            ...(providerSolution.created_by !== undefined && { created_by: providerSolution.created_by }),
            ...(providerSolution.updated_at !== undefined && { updated_at: providerSolution.updated_at }),
            ...(providerSolution.updated_by !== undefined && { updated_by: providerSolution.updated_by }),
            ...(providerSolution.document_ids !== undefined && { document_ids: providerSolution.document_ids }),
            ...(providerSolution.source_platform != null && { source_platform: providerSolution.source_platform })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
