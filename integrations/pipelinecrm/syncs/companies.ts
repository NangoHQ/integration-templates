import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderCompanySchema = z.object({
    id: z.number().describe('Company ID'),
    name: z.string().nullish(),
    description: z.string().nullish(),
    email: z.string().nullish(),
    web: z.string().nullish(),
    fax: z.string().nullish(),
    address_1: z.string().nullish(),
    address_2: z.string().nullish(),
    city: z.string().nullish(),
    state: z.string().nullish(),
    postal_code: z.string().nullish(),
    country: z.string().nullish(),
    phone1: z.string().nullish(),
    phone2: z.string().nullish(),
    phone3: z.string().nullish(),
    phone4: z.string().nullish(),
    phone1_desc: z.string().nullish(),
    phone2_desc: z.string().nullish(),
    phone3_desc: z.string().nullish(),
    phone4_desc: z.string().nullish(),
    owner_id: z.number().nullish(),
    shared_user_ids: z.array(z.number()).nullish(),
    tag_ids: z.array(z.number()).nullish(),
    custom_fields: z.record(z.string(), z.unknown()).nullish(),
    image_thumb_url: z.string().nullish(),
    image_mobile_url: z.string().nullish(),
    facebook_url: z.string().nullish(),
    linked_in_url: z.string().nullish(),
    twitter: z.string().nullish(),
    instant_message: z.string().nullish(),
    next_task_name: z.string().nullish(),
    next_task_id: z.number().nullish(),
    next_task_due: z.string().nullish(),
    next_task_all_day: z.boolean().nullish(),
    owner: z
        .object({
            id: z.number().nullish(),
            full_name: z.string().nullish()
        })
        .nullish(),
    tags: z
        .array(
            z.object({
                id: z.number().nullish(),
                name: z.string().nullish()
            })
        )
        .nullish(),
    possible_notify_user_ids: z.array(z.number()).nullish(),
    created_at: z.string().nullish().describe('Creation timestamp'),
    updated_at: z.string().nullish().describe('Last modified timestamp')
});

const CompanySchema = z.object({
    id: z.string().describe('Company ID'),
    name: z.string().optional(),
    description: z.string().optional(),
    email: z.string().optional(),
    web: z.string().optional(),
    fax: z.string().optional(),
    address_1: z.string().optional(),
    address_2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
    phone1: z.string().optional(),
    phone2: z.string().optional(),
    phone3: z.string().optional(),
    phone4: z.string().optional(),
    phone1_desc: z.string().optional(),
    phone2_desc: z.string().optional(),
    phone3_desc: z.string().optional(),
    phone4_desc: z.string().optional(),
    owner_id: z.number().optional(),
    shared_user_ids: z.array(z.number()).optional(),
    tag_ids: z.array(z.number()).optional(),
    custom_fields: z.record(z.string(), z.unknown()).optional(),
    image_thumb_url: z.string().optional(),
    image_mobile_url: z.string().optional(),
    facebook_url: z.string().optional(),
    linked_in_url: z.string().optional(),
    twitter: z.string().optional(),
    instant_message: z.string().optional(),
    next_task_name: z.string().optional(),
    next_task_id: z.number().optional(),
    next_task_due: z.string().optional(),
    next_task_all_day: z.boolean().optional(),
    owner: z
        .object({
            id: z.number().optional(),
            full_name: z.string().optional()
        })
        .optional(),
    tags: z
        .array(
            z.object({
                id: z.number().optional(),
                name: z.string().optional()
            })
        )
        .optional(),
    possible_notify_user_ids: z.array(z.number()).optional(),
    created_at: z.string().optional().describe('Creation timestamp'),
    updated_at: z.string().optional().describe('Last modified timestamp')
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync companies in this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Company: CompanySchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint && typeof checkpoint === 'object' && 'updated_after' in checkpoint ? checkpoint['updated_after'] : undefined;
        const isFirstRun = !updatedAfter;
        const syncStartTime = new Date()
            .toISOString()
            .replace('T', ' ')
            .replace(/\.\d+Z$/, '');

        if (isFirstRun) {
            await nango.trackDeletesStart('Company');
        }

        const params: Record<string, string | number> = {};
        if (updatedAfter) {
            params['conditions%5Bcompany_modified%5D%5Bfrom_date%5D'] = updatedAfter;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/companies',
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_calculation_method: 'per-page',
                offset_start_value: 1,
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'entries'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const items: unknown[] = page;
            const companies = items.map((raw) => {
                const parsed = ProviderCompanySchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse company: ${parsed.error.message}`);
                }

                const record = parsed.data;
                return {
                    id: String(record.id),
                    ...(record.name != null && { name: record.name }),
                    ...(record.description != null && { description: record.description }),
                    ...(record.email != null && { email: record.email }),
                    ...(record.web != null && { web: record.web }),
                    ...(record.fax != null && { fax: record.fax }),
                    ...(record.address_1 != null && { address_1: record.address_1 }),
                    ...(record.address_2 != null && { address_2: record.address_2 }),
                    ...(record.city != null && { city: record.city }),
                    ...(record.state != null && { state: record.state }),
                    ...(record.postal_code != null && { postal_code: record.postal_code }),
                    ...(record.country != null && { country: record.country }),
                    ...(record.phone1 != null && { phone1: record.phone1 }),
                    ...(record.phone2 != null && { phone2: record.phone2 }),
                    ...(record.phone3 != null && { phone3: record.phone3 }),
                    ...(record.phone4 != null && { phone4: record.phone4 }),
                    ...(record.phone1_desc != null && { phone1_desc: record.phone1_desc }),
                    ...(record.phone2_desc != null && { phone2_desc: record.phone2_desc }),
                    ...(record.phone3_desc != null && { phone3_desc: record.phone3_desc }),
                    ...(record.phone4_desc != null && { phone4_desc: record.phone4_desc }),
                    ...(record.owner_id != null && { owner_id: record.owner_id }),
                    ...(record.shared_user_ids != null && { shared_user_ids: record.shared_user_ids }),
                    ...(record.tag_ids != null && { tag_ids: record.tag_ids }),
                    ...(record.custom_fields != null && { custom_fields: record.custom_fields }),
                    ...(record.image_thumb_url != null && { image_thumb_url: record.image_thumb_url }),
                    ...(record.image_mobile_url != null && { image_mobile_url: record.image_mobile_url }),
                    ...(record.facebook_url != null && { facebook_url: record.facebook_url }),
                    ...(record.linked_in_url != null && { linked_in_url: record.linked_in_url }),
                    ...(record.twitter != null && { twitter: record.twitter }),
                    ...(record.instant_message != null && { instant_message: record.instant_message }),
                    ...(record.next_task_name != null && { next_task_name: record.next_task_name }),
                    ...(record.next_task_id != null && { next_task_id: record.next_task_id }),
                    ...(record.next_task_due != null && { next_task_due: record.next_task_due }),
                    ...(record.next_task_all_day != null && { next_task_all_day: record.next_task_all_day }),
                    ...(record.owner != null && { owner: record.owner }),
                    ...(record.tags != null && { tags: record.tags }),
                    ...(record.possible_notify_user_ids != null && { possible_notify_user_ids: record.possible_notify_user_ids }),
                    ...(record.created_at != null && { created_at: record.created_at }),
                    ...(record.updated_at != null && { updated_at: record.updated_at })
                };
            });

            if (companies.length > 0) {
                await nango.batchSave(companies, 'Company');
            }
        }

        if (isFirstRun) {
            await nango.trackDeletesEnd('Company');
        }

        await nango.saveCheckpoint({
            updated_after: syncStartTime
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
