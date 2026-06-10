import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderServiceSchema = z.object({
    sid: z.string(),
    account_sid: z.string(),
    friendly_name: z.string().nullish(),
    code_length: z.number().nullish(),
    lookup_enabled: z.boolean().nullish(),
    psd2_enabled: z.boolean().nullish(),
    skip_sms_to_landlines: z.boolean().nullish(),
    dtmf_input_required: z.boolean().nullish(),
    tts_name: z.string().nullish(),
    do_not_share_warning_enabled: z.boolean().nullish(),
    custom_code_enabled: z.boolean().nullish(),
    push: z
        .object({
            include_date: z.boolean().nullish(),
            apn_credential_sid: z.string().nullish(),
            fcm_credential_sid: z.string().nullish()
        })
        .nullish(),
    totp: z
        .object({
            issuer: z.string().nullish(),
            time_step: z.number().nullish(),
            code_length: z.number().nullish(),
            skew: z.number().nullish()
        })
        .nullish(),
    whatsapp: z
        .object({
            msg_service_sid: z.string().nullish(),
            from: z.string().nullish()
        })
        .nullish(),
    passkeys: z
        .object({
            relying_party: z
                .object({
                    id: z.string().nullish(),
                    name: z.string().nullish(),
                    origins: z.string().nullish()
                })
                .nullish(),
            authenticator_attachment: z.string().nullish(),
            discoverable_credentials: z.string().nullish(),
            user_verification: z.string().nullish()
        })
        .nullish(),
    default_template_sid: z.string().nullish(),
    verify_event_subscription_enabled: z.boolean().nullish(),
    date_created: z.string().nullish(),
    date_updated: z.string().nullish(),
    url: z.string().nullish(),
    links: z.record(z.string(), z.string()).nullish()
});

const VerifyServiceSchema = z.object({
    id: z.string(),
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
                    origins: z.string().optional()
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

const sync = createSync({
    description: 'Sync Verify services from Twilio',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        VerifyService: VerifyServiceSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/verify-services'
        }
    ],

    exec: async (nango) => {
        // Blocker: Twilio List Services endpoint does not support changed-since filtering,
        // modified_after, or cursor-based incremental retrieval. Full refresh is required.
        await nango.trackDeletesStart('VerifyService');

        const proxyConfig: ProxyConfiguration = {
            // https://www.twilio.com/docs/verify/api/service#list-a-service
            endpoint: '/v2/Services',
            baseUrlOverride: 'https://verify.twilio.com',
            paginate: {
                type: 'link',
                link_path_in_response_body: 'meta.next_page_url',
                response_path: 'services',
                limit_name_in_request: 'PageSize',
                limit: 50
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const services = page.map((item) => {
                const service = ProviderServiceSchema.parse(item);
                return {
                    id: service.sid,
                    sid: service.sid,
                    account_sid: service.account_sid,
                    friendly_name: service.friendly_name == null ? undefined : service.friendly_name,
                    code_length: service.code_length == null ? undefined : service.code_length,
                    lookup_enabled: service.lookup_enabled == null ? undefined : service.lookup_enabled,
                    psd2_enabled: service.psd2_enabled == null ? undefined : service.psd2_enabled,
                    skip_sms_to_landlines: service.skip_sms_to_landlines == null ? undefined : service.skip_sms_to_landlines,
                    dtmf_input_required: service.dtmf_input_required == null ? undefined : service.dtmf_input_required,
                    tts_name: service.tts_name == null ? undefined : service.tts_name,
                    do_not_share_warning_enabled: service.do_not_share_warning_enabled == null ? undefined : service.do_not_share_warning_enabled,
                    custom_code_enabled: service.custom_code_enabled == null ? undefined : service.custom_code_enabled,
                    push:
                        service.push == null
                            ? undefined
                            : {
                                  include_date: service.push.include_date == null ? undefined : service.push.include_date,
                                  apn_credential_sid: service.push.apn_credential_sid == null ? undefined : service.push.apn_credential_sid,
                                  fcm_credential_sid: service.push.fcm_credential_sid == null ? undefined : service.push.fcm_credential_sid
                              },
                    totp:
                        service.totp == null
                            ? undefined
                            : {
                                  issuer: service.totp.issuer == null ? undefined : service.totp.issuer,
                                  time_step: service.totp.time_step == null ? undefined : service.totp.time_step,
                                  code_length: service.totp.code_length == null ? undefined : service.totp.code_length,
                                  skew: service.totp.skew == null ? undefined : service.totp.skew
                              },
                    whatsapp:
                        service.whatsapp == null
                            ? undefined
                            : {
                                  msg_service_sid: service.whatsapp.msg_service_sid == null ? undefined : service.whatsapp.msg_service_sid,
                                  from: service.whatsapp.from == null ? undefined : service.whatsapp.from
                              },
                    passkeys:
                        service.passkeys == null
                            ? undefined
                            : {
                                  relying_party:
                                      service.passkeys.relying_party == null
                                          ? undefined
                                          : {
                                                id: service.passkeys.relying_party.id == null ? undefined : service.passkeys.relying_party.id,
                                                name: service.passkeys.relying_party.name == null ? undefined : service.passkeys.relying_party.name,
                                                origins: service.passkeys.relying_party.origins == null ? undefined : service.passkeys.relying_party.origins
                                            },
                                  authenticator_attachment:
                                      service.passkeys.authenticator_attachment == null ? undefined : service.passkeys.authenticator_attachment,
                                  discoverable_credentials:
                                      service.passkeys.discoverable_credentials == null ? undefined : service.passkeys.discoverable_credentials,
                                  user_verification: service.passkeys.user_verification == null ? undefined : service.passkeys.user_verification
                              },
                    default_template_sid: service.default_template_sid == null ? undefined : service.default_template_sid,
                    verify_event_subscription_enabled:
                        service.verify_event_subscription_enabled == null ? undefined : service.verify_event_subscription_enabled,
                    date_created: service.date_created == null ? undefined : service.date_created,
                    date_updated: service.date_updated == null ? undefined : service.date_updated,
                    url: service.url == null ? undefined : service.url,
                    links: service.links == null ? undefined : service.links
                };
            });

            if (services.length > 0) {
                await nango.batchSave(services, 'VerifyService');
            }
        }

        await nango.trackDeletesEnd('VerifyService');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
