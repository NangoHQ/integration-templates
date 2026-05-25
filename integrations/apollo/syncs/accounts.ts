import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// Apollo Account schema based on API response format
// https://docs.apollo.io/reference/search-for-accounts
const _AccountSchema = z.object({
    id: z.string(),
    domain: z.string().nullable().optional(),
    name: z.string(),
    team_id: z.string().optional(),
    account_stage_id: z.string().optional(),
    label_ids: z.array(z.string()).optional(),
    source: z.string().optional(),
    original_source: z.string().optional(),
    creator_id: z.string().nullable().optional(),
    owner_id: z.string().optional(),
    created_at: z.string(),
    phone: z.string().nullable().optional(),
    phone_status: z.string().optional(),
    hubspot_id: z.string().nullable().optional(),
    salesforce_id: z.string().nullable().optional(),
    crm_owner_id: z.string().nullable().optional(),
    parent_account_id: z.string().nullable().optional(),
    linkedin_url: z.string().nullable().optional(),
    sanitized_phone: z.string().nullable().optional(),
    account_playbook_statuses: z.array(z.unknown()).optional(),
    account_rule_config_statuses: z.array(z.unknown()).optional(),
    existence_level: z.string().optional(),
    typed_custom_fields: z.record(z.string(), z.unknown()).optional(),
    custom_field_errors: z.record(z.string(), z.unknown()).optional(),
    modality: z.string().optional(),
    source_display_name: z.string().optional(),
    crm_record_url: z.string().nullable().optional(),
    contact_emailer_campaign_ids: z.array(z.string()).optional(),
    contact_campaign_status_tally: z.record(z.string(), z.unknown()).optional(),
    num_contacts: z.number().optional(),
    last_activity_date: z.string().nullable().optional(),
    intent_strength: z.unknown().nullable().optional(),
    show_intent: z.boolean().optional(),
    has_intent_signal_account: z.boolean().optional(),
    intent_signal_account: z.unknown().nullable().optional(),
    organization_id: z.string().nullable().optional()
});

const AccountRecordSchema = z.object({
    id: z.string(),
    domain: z.string().optional(),
    name: z.string(),
    team_id: z.string().optional(),
    account_stage_id: z.string().optional(),
    label_ids: z.array(z.string()).optional(),
    source: z.string().optional(),
    original_source: z.string().optional(),
    creator_id: z.string().optional(),
    owner_id: z.string().optional(),
    created_at: z.string(),
    phone: z.string().optional(),
    phone_status: z.string().optional(),
    hubspot_id: z.string().optional(),
    salesforce_id: z.string().optional(),
    crm_owner_id: z.string().optional(),
    parent_account_id: z.string().optional(),
    linkedin_url: z.string().optional(),
    sanitized_phone: z.string().optional(),
    existence_level: z.string().optional(),
    modality: z.string().optional(),
    source_display_name: z.string().optional(),
    crm_record_url: z.string().optional(),
    num_contacts: z.number().optional(),
    last_activity_date: z.string().optional(),
    show_intent: z.boolean().optional(),
    has_intent_signal_account: z.boolean().optional(),
    organization_id: z.string().optional()
});

type Account = z.infer<typeof _AccountSchema>;

const sync = createSync({
    description: 'Sync accounts from Apollo',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/accounts'
        }
    ],
    models: {
        Account: AccountRecordSchema
    },

    exec: async (nango) => {
        // Apollo account search supports sorting and page-based pagination, but it does
        // not expose a changed-since filter we can rely on for incremental syncs.
        await nango.trackDeletesStart('Account');

        const proxyConfig: ProxyConfiguration = {
            // https://docs.apollo.io/reference/search-for-accounts
            endpoint: '/v1/accounts/search',
            method: 'POST',
            data: {
                sort_by_field: 'account_updated_at',
                sort_ascending: true,
                per_page: 100
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'accounts'
            },
            retries: 3
        };

        for await (const accountsBatch of nango.paginate<Account>(proxyConfig)) {
            if (accountsBatch.length === 0) {
                continue;
            }

            const records = accountsBatch.map((account) => ({
                id: account.id,
                domain: account.domain ?? undefined,
                name: account.name,
                team_id: account.team_id,
                account_stage_id: account.account_stage_id,
                label_ids: account.label_ids,
                source: account.source,
                original_source: account.original_source,
                creator_id: account.creator_id ?? undefined,
                owner_id: account.owner_id,
                created_at: account.created_at,
                phone: account.phone ?? undefined,
                phone_status: account.phone_status,
                hubspot_id: account.hubspot_id ?? undefined,
                salesforce_id: account.salesforce_id ?? undefined,
                crm_owner_id: account.crm_owner_id ?? undefined,
                parent_account_id: account.parent_account_id ?? undefined,
                linkedin_url: account.linkedin_url ?? undefined,
                sanitized_phone: account.sanitized_phone ?? undefined,
                existence_level: account.existence_level,
                modality: account.modality,
                source_display_name: account.source_display_name,
                crm_record_url: account.crm_record_url ?? undefined,
                num_contacts: account.num_contacts,
                last_activity_date: account.last_activity_date ?? undefined,
                show_intent: account.show_intent,
                has_intent_signal_account: account.has_intent_signal_account,
                organization_id: account.organization_id ?? undefined
            }));

            await nango.batchSave(records, 'Account');
        }

        await nango.trackDeletesEnd('Account');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
