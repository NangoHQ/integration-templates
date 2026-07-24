import { z } from 'zod';
import { createAction } from 'nango';

const SalarySchema = z.object({
    amount: z.number().optional(),
    frequency: z.string().optional(),
    currency_iso: z.string().optional()
});

const RequisitionSchema = z.object({
    code: z.string().optional(),
    start_date: z.string().optional(),
    salary: SalarySchema.optional()
});

const InputSchema = z.object({
    id: z.string().describe('The candidate ID. Example: "27273038"'),
    member_id: z.string().describe('The member performing the move. Example: "1f395d"'),
    target_stage: z.string().optional().describe('The lowercase stage slug to move the candidate to. Example: "interview"'),
    fill_reserved_requisition: z.boolean().optional().describe('When the candidate has a reserved requisition, set this to true to use that requisition.'),
    requisition: RequisitionSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    target_stage: z.string().optional(),
    success: z.boolean()
});

const action = createAction({
    description: 'Move a candidate to a different pipeline stage.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_candidates'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            member_id: input.member_id
        };

        if (input.target_stage !== undefined) {
            body['target_stage'] = input.target_stage;
        }

        if (input.fill_reserved_requisition !== undefined) {
            body['fill_reserved_requisition'] = input.fill_reserved_requisition;
        }

        if (input.requisition !== undefined) {
            body['requisition'] = input.requisition;
        }

        // https://workable.readme.io/reference/move-candidate.md
        const response = await nango.post({
            endpoint: `/spi/v3/candidates/${encodeURIComponent(input.id)}/move`,
            data: body,
            retries: 10
        });

        if (response.status !== 200 && response.status !== 202) {
            throw new nango.ActionError({
                type: 'unexpected_status',
                message: `Expected 200 or 202 but received ${response.status}`,
                status: response.status
            });
        }

        return {
            id: input.id,
            ...(input.target_stage !== undefined && { target_stage: input.target_stage }),
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
