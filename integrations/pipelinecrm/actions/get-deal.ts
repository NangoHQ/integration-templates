import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Deal ID. Example: 55383278')
});

const ProviderDealSchema = z
    .object({
        id: z.number(),
        name: z.string().nullish(),
        summary: z.string().nullish(),
        user_id: z.number().nullish(),
        status: z.number().nullish(),
        expected_close_date: z.string().nullish(),
        closed_time: z.string().nullish(),
        is_archived: z.boolean().nullish(),
        value: z.union([z.string(), z.number()]).nullish(),
        primary_contact_id: z.number().nullish(),
        person_ids: z.array(z.number()).nullish(),
        shared_user_ids: z.array(z.number()).nullish(),
        company_id: z.number().nullish(),
        company_name: z.string().nullish(),
        probability: z.number().nullish(),
        deal_stage_id: z.number().nullish(),
        deal_loss_reason_id: z.number().nullish(),
        deal_loss_reason_notes: z.string().nullish(),
        deal_won_reason_id: z.number().nullish(),
        deal_won_reason_notes: z.string().nullish(),
        source_id: z.number().nullish(),
        custom_fields: z.record(z.string(), z.unknown()).nullish(),
        tag_ids: z.array(z.number()).nullish(),
        address_1: z.string().nullish(),
        address_2: z.string().nullish(),
        city: z.string().nullish(),
        state: z.string().nullish(),
        postal_code: z.string().nullish(),
        country: z.string().nullish(),
        user: z
            .object({
                id: z.number(),
                first_name: z.string().nullish(),
                last_name: z.string().nullish()
            })
            .nullish(),
        primary_contact: z
            .object({
                id: z.number(),
                full_name: z.string().nullish()
            })
            .nullish(),
        people: z
            .array(
                z.object({
                    id: z.number(),
                    first_name: z.string().nullish(),
                    last_name: z.string().nullish()
                })
            )
            .nullish(),
        collaborators: z
            .array(
                z.object({
                    id: z.number(),
                    first_name: z.string().nullish(),
                    last_name: z.string().nullish()
                })
            )
            .nullish(),
        company: z
            .object({
                id: z.number(),
                name: z.string().nullish()
            })
            .nullish(),
        currency: z
            .object({
                code: z.string(),
                name: z.string(),
                symbol: z.string()
            })
            .nullish(),
        deal_stage: z
            .object({
                id: z.number(),
                name: z.string().nullish()
            })
            .nullish(),
        deal_loss_reason: z
            .object({
                id: z.number(),
                name: z.string().nullish()
            })
            .nullish(),
        source: z
            .object({
                id: z.number(),
                name: z.string().nullish()
            })
            .nullish(),
        possible_notify_user_ids: z.array(z.number()).nullish(),
        next_task_name: z.string().nullish(),
        next_task_id: z.number().nullish(),
        next_task_due: z.string().nullish(),
        next_task_all_day: z.boolean().nullish(),
        tags: z
            .array(
                z.object({
                    id: z.number(),
                    name: z.string().nullish()
                })
            )
            .nullish(),
        created_at: z.string().nullish(),
        updated_at: z.string().nullish()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.number(),
        name: z.string().optional(),
        summary: z.string().optional(),
        user_id: z.number().optional(),
        status: z.number().optional(),
        expected_close_date: z.string().optional(),
        closed_time: z.string().optional(),
        is_archived: z.boolean().optional(),
        value: z.union([z.string(), z.number()]).optional(),
        primary_contact_id: z.number().optional(),
        person_ids: z.array(z.number()).optional(),
        shared_user_ids: z.array(z.number()).optional(),
        company_id: z.number().optional(),
        company_name: z.string().optional(),
        probability: z.number().optional(),
        deal_stage_id: z.number().optional(),
        deal_loss_reason_id: z.number().optional(),
        deal_loss_reason_notes: z.string().optional(),
        deal_won_reason_id: z.number().optional(),
        deal_won_reason_notes: z.string().optional(),
        source_id: z.number().optional(),
        custom_fields: z.record(z.string(), z.unknown()).optional(),
        tag_ids: z.array(z.number()).optional(),
        address_1: z.string().optional(),
        address_2: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postal_code: z.string().optional(),
        country: z.string().optional(),
        user: z
            .object({
                id: z.number(),
                first_name: z.string().optional(),
                last_name: z.string().optional()
            })
            .optional(),
        primary_contact: z
            .object({
                id: z.number(),
                full_name: z.string().optional()
            })
            .optional(),
        people: z
            .array(
                z.object({
                    id: z.number(),
                    first_name: z.string().optional(),
                    last_name: z.string().optional()
                })
            )
            .optional(),
        collaborators: z
            .array(
                z.object({
                    id: z.number(),
                    first_name: z.string().optional(),
                    last_name: z.string().optional()
                })
            )
            .optional(),
        company: z
            .object({
                id: z.number(),
                name: z.string().optional()
            })
            .optional(),
        currency: z
            .object({
                code: z.string(),
                name: z.string(),
                symbol: z.string()
            })
            .optional(),
        deal_stage: z
            .object({
                id: z.number(),
                name: z.string().optional()
            })
            .optional(),
        deal_loss_reason: z
            .object({
                id: z.number(),
                name: z.string().optional()
            })
            .optional(),
        source: z
            .object({
                id: z.number(),
                name: z.string().optional()
            })
            .optional(),
        possible_notify_user_ids: z.array(z.number()).optional(),
        next_task_name: z.string().optional(),
        next_task_id: z.number().optional(),
        next_task_due: z.string().optional(),
        next_task_all_day: z.boolean().optional(),
        tags: z
            .array(
                z.object({
                    id: z.number(),
                    name: z.string().optional()
                })
            )
            .optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

function omitNull(value: unknown): unknown {
    if (value === null) {
        return undefined;
    }
    if (Array.isArray(value)) {
        return value.map(omitNull);
    }
    if (typeof value === 'object' && value !== null) {
        const result: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
            const cleaned = omitNull(val);
            if (cleaned !== undefined) {
                result[key] = cleaned;
            }
        }
        return result;
    }
    return value;
}

const action = createAction({
    description: 'Get a single deal by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://app.pipelinecrm.com/api/docs/introduction
        const response = await nango.get({
            endpoint: `/api/v3/deals/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Deal not found.'
            });
        }

        const providerDeal = ProviderDealSchema.parse(response.data);
        const cleaned = omitNull(providerDeal);

        return OutputSchema.parse(cleaned);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
