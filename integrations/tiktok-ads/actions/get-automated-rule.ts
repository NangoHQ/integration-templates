import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    rule_id: z.string().describe('Automated rule ID. Example: "123456789"')
});

const RuleActionSchema = z.object({
    action_type: z.string().optional(),
    subject_type: z.string().optional(),
    value_type: z.string().optional(),
    value: z.unknown().optional()
});

const RuleConditionSchema = z.object({
    subject_type: z.string().optional(),
    calculation_type: z.string().optional(),
    match_type: z.string().optional(),
    range_type: z.string().optional(),
    values: z.array(z.string()).optional()
});

const RuleApplyObjectSchema = z.object({
    object_id: z.string().optional(),
    object_type: z.string().optional()
});

const RuleNotificationSchema = z.object({
    email: z.array(z.string()).optional()
});

const RuleExecInfoSchema = z.object({
    exec_time_type: z.string().optional(),
    exec_time: z.string().optional(),
    time_period_info: z.array(z.unknown()).optional()
});

const RuleSchema = z
    .object({
        rule_id: z.string(),
        advertiser_id: z.string().optional(),
        name: z.string().optional(),
        status: z.string().optional(),
        data_dimension: z.string().optional(),
        actions: z.array(RuleActionSchema).optional(),
        conditions: z.array(RuleConditionSchema).optional(),
        apply_objects: z.array(RuleApplyObjectSchema).optional(),
        notification: RuleNotificationSchema.optional(),
        rule_exec_info: RuleExecInfoSchema.optional(),
        tzone: z.string().optional(),
        create_time: z.string().optional(),
        modify_time: z.string().optional()
    })
    .passthrough();

const OutputSchema = RuleSchema;

const ResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    request_id: z.string().optional(),
    data: z
        .object({
            list: z.array(z.unknown())
        })
        .optional()
});

const action = createAction({
    description: 'Retrieve an automated rule by ID from TikTok Ads.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://business-api.tiktok.com/portal/docs?id=1738768750822466
        const response = await nango.get({
            endpoint: 'optimizer/rule/get/',
            params: {
                advertiser_id: input.advertiser_id,
                rule_ids: JSON.stringify([input.rule_id])
            },
            retries: 3
        });

        const envelope = ResponseSchema.parse(response.data);

        if (envelope.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: envelope.message,
                code: envelope.code
            });
        }

        const rules = envelope.data?.list ?? [];
        if (rules.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Automated rule ${input.rule_id} not found`,
                rule_id: input.rule_id
            });
        }

        const rule = RuleSchema.parse(rules[0]);
        return rule;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
