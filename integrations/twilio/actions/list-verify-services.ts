import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (PageToken) from the previous response. Omit for the first page.'),
    page: z.number().optional().describe('Page index. This value is simply for client state.'),
    page_size: z.number().optional().describe('How many resources to return in each list page. The default is 50, and the maximum is 1000.')
});

const ServiceSchema = z.object({
    sid: z.string().optional(),
    account_sid: z.string().optional(),
    friendly_name: z.string().optional(),
    code_length: z.number().nullable().optional(),
    lookup_enabled: z.boolean().nullable().optional(),
    psd2_enabled: z.boolean().nullable().optional(),
    skip_sms_to_landlines: z.boolean().nullable().optional(),
    dtmf_input_required: z.boolean().nullable().optional(),
    tts_name: z.string().nullable().optional(),
    do_not_share_warning_enabled: z.boolean().nullable().optional(),
    custom_code_enabled: z.boolean().nullable().optional(),
    push: z
        .object({
            include_date: z.boolean().nullable().optional(),
            apn_credential_sid: z.string().nullable().optional(),
            fcm_credential_sid: z.string().nullable().optional()
        })
        .optional(),
    totp: z
        .object({
            issuer: z.string().nullable().optional(),
            time_step: z.number().nullable().optional(),
            code_length: z.number().nullable().optional(),
            skew: z.number().nullable().optional()
        })
        .optional(),
    whatsapp: z
        .object({
            msg_service_sid: z.string().nullable().optional(),
            from: z.string().nullable().optional()
        })
        .optional(),
    passkeys: z
        .object({
            relying_party: z
                .object({
                    id: z.string().nullable().optional(),
                    name: z.string().nullable().optional(),
                    origins: z.array(z.string()).nullable().optional()
                })
                .optional(),
            authenticator_attachment: z.string().nullable().optional(),
            discoverable_credentials: z.string().nullable().optional(),
            user_verification: z.string().nullable().optional()
        })
        .optional(),
    default_template_sid: z.string().nullable().optional(),
    verify_event_subscription_enabled: z.boolean().nullable().optional(),
    date_created: z.string().nullable().optional(),
    date_updated: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    links: z.record(z.string(), z.string()).optional()
});

const MetaSchema = z.object({
    page: z.number().optional(),
    page_size: z.number().optional(),
    first_page_url: z.string().optional(),
    previous_page_url: z.string().nullable().optional(),
    next_page_url: z.string().nullable().optional(),
    key: z.string().optional(),
    url: z.string().optional(),
    next_page_token: z.string().nullable().optional()
});

const OutputSchema = z.object({
    services: z.array(ServiceSchema),
    meta: MetaSchema.optional()
});

const action = createAction({
    description: 'List Verify services from Twilio.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://www.twilio.com/docs/verify/api/service
            endpoint: '/v2/Services',
            baseUrlOverride: 'https://verify.twilio.com',
            params: {
                ...(input.cursor !== undefined && { PageToken: input.cursor }),
                ...(input.page !== undefined && { Page: String(input.page) }),
                ...(input.page_size !== undefined && { PageSize: String(input.page_size) })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const parsed = z
            .object({
                services: z.array(z.unknown()),
                meta: z
                    .object({
                        page: z.number().optional(),
                        page_size: z.number().optional(),
                        first_page_url: z.string().optional(),
                        previous_page_url: z.string().nullable().optional(),
                        next_page_url: z.string().nullable().optional(),
                        key: z.string().optional(),
                        url: z.string().optional(),
                        next_page_token: z.string().nullable().optional()
                    })
                    .optional()
            })
            .parse(response.data);

        const services = parsed.services.map((service) => ServiceSchema.parse(service));

        return {
            services,
            meta: parsed.meta
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
