import { z } from 'zod';
import { createAction } from 'nango';

const FrequencyInfoSchema = z.object({
    type: z.string().describe('Frequency type. Example: "ONCE", "CUSTOM"'),
    count: z.number().optional(),
    custom_frequency_type: z.string().optional(),
    time: z.number().optional()
});

const ActionValueSchema = z.object({
    limit: z.number().optional(),
    use_limit: z.boolean().optional(),
    value: z.number().optional()
});

const RuleActionSchema = z.object({
    subject_type: z.string().describe('Subject type of the action. Example: "BUDGET", "BID"'),
    action_type: z.string().optional().describe('Action type. Example: "INCREASE", "DECREASE", "SET"'),
    value_type: z.string().optional().describe('Value type. Example: "PERCENTAGE", "ABSOLUTE"'),
    value: ActionValueSchema.optional(),
    frequency_info: FrequencyInfoSchema.optional()
});

const ApplyObjectSchema = z.object({
    dimension: z.string().describe('Dimension to apply the rule to. Example: "CAMPAIGN", "ADGROUP"'),
    pre_condition_type: z.string().describe('Pre-condition type. Example: "ALL", "PARTIAL"'),
    bind_type: z.string().optional(),
    dimension_ids: z.array(z.string()).optional()
});

const ConditionSchema = z.object({
    subject_type: z.string().describe('Subject type of the condition. Example: "COST_PER_RESULT", "SPEND"'),
    calculation_type: z.string().optional().describe('Calculation type. Example: "ALL_TIME", "DAILY"'),
    match_type: z.string().optional().describe('Match type. Example: "GREATER_THAN", "LESS_THAN"'),
    range_type: z.string().optional().describe('Range type. Example: "ABSOLUTE", "PERCENTAGE"'),
    values: z.array(z.string()).optional()
});

const EmailSettingSchema = z.object({
    email_exec_time: z.array(z.string()).optional(),
    mute_option: z.string().optional(),
    no_result_notification: z.boolean().optional(),
    notification_period: z.string().optional()
});

const NotificationSchema = z.object({
    notification_type: z.string().describe('Notification type. Example: "EMAIL", "NONE"'),
    email_setting: EmailSettingSchema.optional()
});

const TimePeriodInfoSchema = z.object({
    date_type: z.string().describe('Date type. Example: "WEEKDAY", "WEEKEND"'),
    start_time: z.string().describe('Start time. Example: "09:00"'),
    end_time: z.string().describe('End time. Example: "18:00"'),
    num: z.array(z.number())
});

const RuleExecInfoSchema = z.object({
    exec_time_type: z.string().describe('Execution time type. Example: "SCHEDULED", "REALTIME"'),
    exec_time: z.string().optional().describe('Execution time. Example: "09:00"'),
    time_period_info: z.array(TimePeriodInfoSchema).optional()
});

const RuleUpdateSchema = z.object({
    rule_id: z.string().describe('Rule ID to update. Example: "1234567890"'),
    name: z.string().describe('Rule name. Example: "My Automated Rule"'),
    actions: z.array(RuleActionSchema),
    apply_objects: z.array(ApplyObjectSchema),
    conditions: z.array(ConditionSchema),
    notification: NotificationSchema,
    rule_exec_info: RuleExecInfoSchema,
    tzone: z.string().optional().describe('Timezone. Example: "UTC"')
});

const InputSchema = z.object({
    advertiser_id: z.string().describe('Advertiser ID. Example: "7644143197428744199"'),
    lang: z.string().optional().describe('Language. Default: "EN"'),
    rules: z.array(RuleUpdateSchema).describe('Array of rules to update')
});

const ProviderResponseDataSchema = z.object({}).passthrough();

const OutputSchema = z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    request_id: z.string().optional(),
    data: ProviderResponseDataSchema.optional()
});

const action = createAction({
    description: 'Update an automated rule in TikTok Ads.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-automated-rule',
        group: 'Automated Rules'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads_management'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://business-api.tiktok.com/portal/docs?id=1738769123170306
            endpoint: 'optimizer/rule/update/',
            data: {
                advertiser_id: input.advertiser_id,
                ...(input.lang !== undefined && { lang: input.lang }),
                rules: input.rules
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            code: z.number().optional(),
            message: z.string().optional(),
            request_id: z.string().optional(),
            data: z.unknown().optional()
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from TikTok API'
            });
        }

        const raw = parsed.data;

        if (raw.code !== undefined && raw.code !== 0) {
            throw new nango.ActionError({
                type: 'api_error',
                message: raw.message || 'TikTok API returned an error',
                code: raw.code,
                request_id: raw.request_id
            });
        }

        return {
            ...(raw.code !== undefined && { code: raw.code }),
            ...(raw.message !== undefined && { message: raw.message }),
            ...(raw.request_id !== undefined && { request_id: raw.request_id }),
            ...(raw.data !== undefined && { data: ProviderResponseDataSchema.parse(raw.data) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
