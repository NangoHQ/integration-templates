import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    service_sid: z.string().describe('The Twilio-provided SID that uniquely identifies the Verify Service. Example: "VA9a01b6fde6aaf381bc6fe7424b7fe293"')
});

const ProviderPushSchema = z.object({
    include_date: z.boolean().optional(),
    apn_credential_sid: z.string().nullable().optional(),
    fcm_credential_sid: z.string().nullable().optional()
});

const ProviderTotpSchema = z.object({
    issuer: z.string().nullable().optional(),
    time_step: z.number().nullable().optional(),
    code_length: z.number().nullable().optional(),
    skew: z.number().nullable().optional()
});

const ProviderWhatsappSchema = z.object({
    msg_service_sid: z.string().nullable().optional(),
    from: z.string().nullable().optional()
});

const ProviderRelyingPartySchema = z.object({
    id: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    origins: z.array(z.string()).nullable().optional()
});

const ProviderPasskeysSchema = z.object({
    relying_party: ProviderRelyingPartySchema.optional(),
    authenticator_attachment: z.string().nullable().optional(),
    discoverable_credentials: z.string().nullable().optional(),
    user_verification: z.string().nullable().optional()
});

const ProviderServiceSchema = z.object({
    sid: z.string(),
    account_sid: z.string(),
    friendly_name: z.string().nullable().optional(),
    code_length: z.number().nullable().optional(),
    lookup_enabled: z.boolean().optional(),
    psd2_enabled: z.boolean().optional(),
    skip_sms_to_landlines: z.boolean().optional(),
    dtmf_input_required: z.boolean().optional(),
    tts_name: z.string().nullable().optional(),
    do_not_share_warning_enabled: z.boolean().optional(),
    custom_code_enabled: z.boolean().optional(),
    push: ProviderPushSchema.nullable().optional(),
    totp: ProviderTotpSchema.nullable().optional(),
    whatsapp: ProviderWhatsappSchema.nullable().optional(),
    passkeys: ProviderPasskeysSchema.nullable().optional(),
    default_template_sid: z.string().nullable().optional(),
    verify_event_subscription_enabled: z.boolean().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    url: z.string().optional(),
    links: z.record(z.string(), z.string()).optional()
});

const OutputSchema = z.object({
    sid: z.string(),
    account_sid: z.string(),
    friendly_name: z.string().optional(),
    code_length: z.number().optional(),
    lookup_enabled: z.boolean().optional(),
    psd2_enabled: z.boolean().optional(),
    skip_sms_to_landlines: z.boolean().optional(),
    dtmf_input_required: z.boolean().optional(),
    tts_name: z.string().optional(),
    do_not_share_warning_enabled: z.boolean().optional(),
    custom_code_enabled: z.boolean().optional(),
    push: z
        .object({
            include_date: z.boolean().optional(),
            apn_credential_sid: z.string().optional(),
            fcm_credential_sid: z.string().optional()
        })
        .optional(),
    totp: z
        .object({
            issuer: z.string().optional(),
            time_step: z.number().optional(),
            code_length: z.number().optional(),
            skew: z.number().optional()
        })
        .optional(),
    whatsapp: z
        .object({
            msg_service_sid: z.string().optional(),
            from: z.string().optional()
        })
        .optional(),
    passkeys: z
        .object({
            relying_party: z
                .object({
                    id: z.string().optional(),
                    name: z.string().optional(),
                    origins: z.array(z.string()).optional()
                })
                .optional(),
            authenticator_attachment: z.string().optional(),
            discoverable_credentials: z.string().optional(),
            user_verification: z.string().optional()
        })
        .optional(),
    default_template_sid: z.string().optional(),
    verify_event_subscription_enabled: z.boolean().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    url: z.string().optional(),
    links: z.record(z.string(), z.string()).optional()
});

const action = createAction({
    description: 'Retrieve a single Verify service from Twilio.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.twilio.com/docs/verify/api/service
            endpoint: `/v2/Services/${encodeURIComponent(input.service_sid)}`,
            baseUrlOverride: 'https://verify.twilio.com',
            retries: 3
        });

        const providerService = ProviderServiceSchema.parse(response.data);

        return {
            sid: providerService.sid,
            account_sid: providerService.account_sid,
            ...(providerService.friendly_name !== null && providerService.friendly_name !== undefined && { friendly_name: providerService.friendly_name }),
            ...(providerService.code_length !== null && providerService.code_length !== undefined && { code_length: providerService.code_length }),
            ...(providerService.lookup_enabled !== undefined && { lookup_enabled: providerService.lookup_enabled }),
            ...(providerService.psd2_enabled !== undefined && { psd2_enabled: providerService.psd2_enabled }),
            ...(providerService.skip_sms_to_landlines !== undefined && { skip_sms_to_landlines: providerService.skip_sms_to_landlines }),
            ...(providerService.dtmf_input_required !== undefined && { dtmf_input_required: providerService.dtmf_input_required }),
            ...(providerService.tts_name !== null && providerService.tts_name !== undefined && { tts_name: providerService.tts_name }),
            ...(providerService.do_not_share_warning_enabled !== undefined && { do_not_share_warning_enabled: providerService.do_not_share_warning_enabled }),
            ...(providerService.custom_code_enabled !== undefined && { custom_code_enabled: providerService.custom_code_enabled }),
            ...(providerService.push !== null &&
                providerService.push !== undefined && {
                    push: {
                        ...(providerService.push.include_date !== undefined && { include_date: providerService.push.include_date }),
                        ...(providerService.push.apn_credential_sid !== null &&
                            providerService.push.apn_credential_sid !== undefined && { apn_credential_sid: providerService.push.apn_credential_sid }),
                        ...(providerService.push.fcm_credential_sid !== null &&
                            providerService.push.fcm_credential_sid !== undefined && { fcm_credential_sid: providerService.push.fcm_credential_sid })
                    }
                }),
            ...(providerService.totp !== null &&
                providerService.totp !== undefined && {
                    totp: {
                        ...(providerService.totp.issuer !== null && providerService.totp.issuer !== undefined && { issuer: providerService.totp.issuer }),
                        ...(providerService.totp.time_step !== null &&
                            providerService.totp.time_step !== undefined && { time_step: providerService.totp.time_step }),
                        ...(providerService.totp.code_length !== null &&
                            providerService.totp.code_length !== undefined && { code_length: providerService.totp.code_length }),
                        ...(providerService.totp.skew !== null && providerService.totp.skew !== undefined && { skew: providerService.totp.skew })
                    }
                }),
            ...(providerService.whatsapp !== null &&
                providerService.whatsapp !== undefined && {
                    whatsapp: {
                        ...(providerService.whatsapp.msg_service_sid !== null &&
                            providerService.whatsapp.msg_service_sid !== undefined && { msg_service_sid: providerService.whatsapp.msg_service_sid }),
                        ...(providerService.whatsapp.from !== null && providerService.whatsapp.from !== undefined && { from: providerService.whatsapp.from })
                    }
                }),
            ...(providerService.passkeys !== null &&
                providerService.passkeys !== undefined && {
                    passkeys: {
                        ...(providerService.passkeys.relying_party !== null &&
                            providerService.passkeys.relying_party !== undefined && {
                                relying_party: {
                                    ...(providerService.passkeys.relying_party.id !== null &&
                                        providerService.passkeys.relying_party.id !== undefined && { id: providerService.passkeys.relying_party.id }),
                                    ...(providerService.passkeys.relying_party.name !== null &&
                                        providerService.passkeys.relying_party.name !== undefined && { name: providerService.passkeys.relying_party.name }),
                                    ...(providerService.passkeys.relying_party.origins !== null &&
                                        providerService.passkeys.relying_party.origins !== undefined && {
                                            origins: providerService.passkeys.relying_party.origins
                                        })
                                }
                            }),
                        ...(providerService.passkeys.authenticator_attachment !== null &&
                            providerService.passkeys.authenticator_attachment !== undefined && {
                                authenticator_attachment: providerService.passkeys.authenticator_attachment
                            }),
                        ...(providerService.passkeys.discoverable_credentials !== null &&
                            providerService.passkeys.discoverable_credentials !== undefined && {
                                discoverable_credentials: providerService.passkeys.discoverable_credentials
                            }),
                        ...(providerService.passkeys.user_verification !== null &&
                            providerService.passkeys.user_verification !== undefined && { user_verification: providerService.passkeys.user_verification })
                    }
                }),
            ...(providerService.default_template_sid !== null &&
                providerService.default_template_sid !== undefined && { default_template_sid: providerService.default_template_sid }),
            ...(providerService.verify_event_subscription_enabled !== undefined && {
                verify_event_subscription_enabled: providerService.verify_event_subscription_enabled
            }),
            ...(providerService.date_created !== undefined && { date_created: providerService.date_created }),
            ...(providerService.date_updated !== undefined && { date_updated: providerService.date_updated }),
            ...(providerService.url !== undefined && { url: providerService.url }),
            ...(providerService.links !== undefined && { links: providerService.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
