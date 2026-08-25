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

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

type Account = z.infer<typeof _AccountSchema>;

const sync = createSync({
    description: 'Sync accounts from Apollo',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/accounts'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        Account: AccountRecordSchema
    },

    exec: async (nango) => {
        // Apollo account search supports sorting and page-based pagination, but it does
        // not expose a changed-since filter we can rely on for incremental syncs.
        const checkpoint = await nango.getCheckpoint();
        const startPage = checkpoint != null && typeof checkpoint['page'] === 'number' ? checkpoint['page'] : 1;
        let page: number | undefined = startPage;

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
                offset_start_value: startPage,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'accounts',
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const accountsBatch of nango.paginate<Account>(proxyConfig)) {
            const records = accountsBatch.map((account) => {
                const parsed = _AccountSchema.safeParse(account);
                if (!parsed.success) {
                    throw new Error(`Failed to parse account: ${parsed.error.message}`);
                }
                const a = parsed.data;
                return {
                    id: a.id,
                    domain: a.domain ?? undefined,
                    name: a.name,
                    team_id: a.team_id,
                    account_stage_id: a.account_stage_id,
                    label_ids: a.label_ids,
                    source: a.source,
                    original_source: a.original_source,
                    creator_id: a.creator_id ?? undefined,
                    owner_id: a.owner_id,
                    created_at: a.created_at,
                    phone: a.phone ?? undefined,
                    phone_status: a.phone_status,
                    hubspot_id: a.hubspot_id ?? undefined,
                    salesforce_id: a.salesforce_id ?? undefined,
                    crm_owner_id: a.crm_owner_id ?? undefined,
                    parent_account_id: a.parent_account_id ?? undefined,
                    linkedin_url: a.linkedin_url ?? undefined,
                    sanitized_phone: a.sanitized_phone ?? undefined,
                    existence_level: a.existence_level,
                    modality: a.modality,
                    source_display_name: a.source_display_name,
                    crm_record_url: a.crm_record_url ?? undefined,
                    num_contacts: a.num_contacts,
                    last_activity_date: a.last_activity_date ?? undefined,
                    show_intent: a.show_intent,
                    has_intent_signal_account: a.has_intent_signal_account,
                    organization_id: a.organization_id ?? undefined
                };
            });

            if (records.length > 0) {
                await nango.batchSave(records, 'Account');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Account');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
