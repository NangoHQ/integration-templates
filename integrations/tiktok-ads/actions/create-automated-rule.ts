import { z } from 'zod';
import { createAction } from 'nango';

const RuleValueSchema = z.object({
    limit: z.number().optional(),
    use_limit: z.boolean().optional(),
    value: z.number().optional()
});

const FrequencyInfoSchema = z.object({
    count: z.number().optional(),
    custom_frequency_type: z.string().optional(),
    time: z.number().optional(),
    type: z.string().describe('Frequency type. Example: "ONCE", "CONTINUOUS"')
});

const RuleActionSchema = z.object({
    action_type: z.string().optional(),
    frequency_info: FrequencyInfoSchema.optional(),
    subject_type: z.string().describe('Action subject type. Example: "BUDGET", "BID", "STATUS"'),
    value: RuleValueSchema.optional(),
    value_type: z.string().optional()
});

const RuleConditionSchema = z.object({
    calculation_type: z.string().optional(),
    match_type: z.string().optional(),
    range_type: z.string().optional(),
    subject_type: z.string().describe('Condition subject type. Example: "SPEND", "BUDGET", "COST_PER_RESULT"'),
    values: z.array(z.string()).optional()
});

const ApplyObjectSchema = z.object({
    bind_type: z.string().optional(),
    dimension: z.string().describe('Dimension to apply the rule to. Example: "CAMPAIGN", "ADGROUP", "AD"'),
    dimension_ids: z.array(z.string()).optional(),
    pre_condition_type: z.string().describe('Pre-condition type. Example: "ALL", "IN", "NOT_IN"')
});

const EmailSettingSchema = z.object({
    email_exec_time: z.array(z.string()).optional(),
    mute_option: z.string().optional(),
    no_result_notification: z.boolean().optional(),
    notification_period: z.string().optional()
});

const NotificationSchema = z.object({
    email_setting: EmailSettingSchema.optional(),
    notification_type: z.string().describe('Notification type. Example: "SEND_NOTIFICATION", "NO_NOTIFICATION"')
});

const TimePeriodInfoSchema = z.object({
    date_type: z.string(),
    end_time: z.string(),
    num: z.array(z.number()),
    start_time: z.string()
});

const RuleExecInfoSchema = z.object({
    exec_time: z.string().optional(),
    exec_time_type: z.string().describe('Execution time type. Example: "SCHEDULE", "CONTINUOUS"'),
    time_period_info: z.array(TimePeriodInfoSchema).optional()
});

const RuleSchema = z.object({
    actions: z.array(RuleActionSchema),
    apply_objects: z.array(ApplyObjectSchema),
    conditions: z.array(RuleConditionSchema),
    name: z.string().describe('Rule name. Example: "Increase budget for high-performing campaigns"'),
    notification: NotificationSchema,
    rule_exec_info: RuleExecInfoSchema,
    tzone: z.string().optional().describe('Timezone. Example: "America/Los_Angeles", "UTC"')
});

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    lang: z.string().optional().describe('Language. Default: "EN"'),
    rules: z.array(RuleSchema)
});

const ProviderSuccessSchema = z.record(z.string(), z.unknown());

const ProviderFailedSchema = z.record(z.string(), z.unknown());

const ProviderDataSchema = z.object({
    success: z.array(ProviderSuccessSchema).optional(),
    failed: z.array(ProviderFailedSchema).optional()
});

const OutputSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: ProviderDataSchema.optional()
});

const action = createAction({
    description: 'Create an automated rule for budget or bid management in TikTok Ads.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads_management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody = {
            advertiser_id: input.advertiser_id,
            ...(input.lang !== undefined && { lang: input.lang }),
            rules: input.rules.map((rule) => ({
                name: rule.name,
                actions: rule.actions.map((actionItem) => ({
                    subject_type: actionItem.subject_type,
                    ...(actionItem.action_type !== undefined && { action_type: actionItem.action_type }),
                    ...(actionItem.frequency_info !== undefined && { frequency_info: actionItem.frequency_info }),
                    ...(actionItem.value !== undefined && { value: actionItem.value }),
                    ...(actionItem.value_type !== undefined && { value_type: actionItem.value_type })
                })),
                conditions: rule.conditions.map((condition) => ({
                    subject_type: condition.subject_type,
                    ...(condition.calculation_type !== undefined && { calculation_type: condition.calculation_type }),
                    ...(condition.match_type !== undefined && { match_type: condition.match_type }),
                    ...(condition.range_type !== undefined && { range_type: condition.range_type }),
                    ...(condition.values !== undefined && { values: condition.values })
                })),
                apply_objects: rule.apply_objects.map((applyObject) => ({
                    dimension: applyObject.dimension,
                    pre_condition_type: applyObject.pre_condition_type,
                    ...(applyObject.bind_type !== undefined && { bind_type: applyObject.bind_type }),
                    ...(applyObject.dimension_ids !== undefined && { dimension_ids: applyObject.dimension_ids })
                })),
                notification: {
                    notification_type: rule.notification.notification_type,
                    ...(rule.notification.email_setting !== undefined && {
                        email_setting: rule.notification.email_setting
                    })
                },
                rule_exec_info: {
                    exec_time_type: rule.rule_exec_info.exec_time_type,
                    ...(rule.rule_exec_info.exec_time !== undefined && { exec_time: rule.rule_exec_info.exec_time }),
                    ...(rule.rule_exec_info.time_period_info !== undefined && {
                        time_period_info: rule.rule_exec_info.time_period_info
                    })
                },
                ...(rule.tzone !== undefined && { tzone: rule.tzone })
            }))
        };

        const response = await nango.post({
            // https://business-api.tiktok.com/portal/docs?id=1738767670852610
            endpoint: 'optimizer/rule/create/',
            data: requestBody,
            retries: 1
        });

        const parsed = z
            .object({
                code: z.number().optional(),
                message: z.string().optional(),
                request_id: z.string().optional(),
                data: z.unknown().optional()
            })
            .parse(response.data);

        if (parsed.code !== undefined && parsed.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: parsed.message || `TikTok API error (code: ${parsed.code})`,
                code: parsed.code,
                request_id: parsed.request_id
            });
        }

        const responseData = parsed.data !== undefined && parsed.data !== null ? ProviderDataSchema.parse(parsed.data) : undefined;

        return {
            ...(parsed.code !== undefined && { code: parsed.code }),
            ...(parsed.message !== undefined && { message: parsed.message }),
            ...(parsed.request_id !== undefined && { request_id: parsed.request_id }),
            ...(responseData !== undefined && { data: responseData })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
