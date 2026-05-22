import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ListSchema = z.object({
    id: z.string()
});

const TagSchema = z.object({
    id: z.number().optional(),
    name: z.string().optional()
});

const LocationSchema = z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    gmtoff: z.number().optional(),
    dstoff: z.number().optional(),
    country_code: z.string().optional(),
    timezone: z.string().optional(),
    region: z.string().optional()
});

const MemberSchema = z.object({
    id: z.string(),
    email_address: z.string().optional(),
    unique_email_id: z.string().optional(),
    contact_id: z.string().optional(),
    full_name: z.string().optional(),
    web_id: z.number().optional(),
    email_type: z.string().optional(),
    status: z.string().optional(),
    unsubscribe_reason: z.string().optional(),
    consents_to_one_to_one_messaging: z.boolean().optional(),
    merge_fields: z.record(z.string(), z.unknown()).optional(),
    interests: z.record(z.string(), z.unknown()).optional(),
    ip_signup: z.string().optional(),
    timestamp_signup: z.string().optional(),
    ip_opt: z.string().optional(),
    timestamp_opt: z.string().optional(),
    member_rating: z.number().optional(),
    last_changed: z.string().optional(),
    language: z.string().optional(),
    vip: z.boolean().optional(),
    email_client: z.string().optional(),
    location: LocationSchema.optional(),
    source: z.string().optional(),
    tags_count: z.number().optional(),
    tags: z.array(TagSchema).optional(),
    list_id: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

function withOneSecondOverlap(isoTimestamp: string): string {
    const timestamp = Date.parse(isoTimestamp);
    if (Number.isNaN(timestamp)) {
        return isoTimestamp;
    }

    return new Date(timestamp - 1000).toISOString().replace('.000Z', '+00:00');
}

const sync = createSync({
    description: 'Sync members from Mailchimp.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Member: MemberSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/members'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        const updatedAfter = parsedCheckpoint.success ? parsedCheckpoint.data.updated_after : undefined;

        let maxLastChanged: string | undefined = updatedAfter;
        const listIds: string[] = [];

        const listsConfig: ProxyConfiguration = {
            // https://mailchimp.com/developer/marketing/api/lists/
            endpoint: '/3.0/lists',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: 0,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'lists'
            },
            retries: 3
        };

        for await (const page of nango.paginate(listsConfig)) {
            for (const raw of page) {
                const parsed = ListSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse list: ${parsed.error.message}`);
                }
                listIds.push(parsed.data.id);
            }
        }

        for (const listId of listIds) {
            const membersConfig: ProxyConfiguration = {
                // https://mailchimp.com/developer/marketing/api/list-members/
                endpoint: `/3.0/lists/${encodeURIComponent(listId)}/members`,
                params: {
                    ...(updatedAfter && { since_last_changed: updatedAfter })
                },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'offset',
                    offset_start_value: 0,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'count',
                    limit: 100,
                    response_path: 'members'
                },
                retries: 3
            };

            for await (const page of nango.paginate(membersConfig)) {
                const members = [];
                for (const raw of page) {
                    const parsed = MemberSchema.safeParse(raw);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse member: ${parsed.error.message}`);
                    }
                    const m = parsed.data;
                    members.push({
                        id: m.id,
                        ...(m.email_address !== undefined && { email_address: m.email_address }),
                        ...(m.unique_email_id !== undefined && { unique_email_id: m.unique_email_id }),
                        ...(m.contact_id !== undefined && { contact_id: m.contact_id }),
                        ...(m.full_name !== undefined && { full_name: m.full_name }),
                        ...(m.web_id !== undefined && { web_id: m.web_id }),
                        ...(m.email_type !== undefined && { email_type: m.email_type }),
                        ...(m.status !== undefined && { status: m.status }),
                        ...(m.unsubscribe_reason !== undefined && { unsubscribe_reason: m.unsubscribe_reason }),
                        ...(m.consents_to_one_to_one_messaging !== undefined && { consents_to_one_to_one_messaging: m.consents_to_one_to_one_messaging }),
                        ...(m.merge_fields !== undefined && { merge_fields: m.merge_fields }),
                        ...(m.interests !== undefined && { interests: m.interests }),
                        ...(m.ip_signup !== undefined && { ip_signup: m.ip_signup }),
                        ...(m.timestamp_signup !== undefined && { timestamp_signup: m.timestamp_signup }),
                        ...(m.ip_opt !== undefined && { ip_opt: m.ip_opt }),
                        ...(m.timestamp_opt !== undefined && { timestamp_opt: m.timestamp_opt }),
                        ...(m.member_rating !== undefined && { member_rating: m.member_rating }),
                        ...(m.last_changed !== undefined && { last_changed: m.last_changed }),
                        ...(m.language !== undefined && { language: m.language }),
                        ...(m.vip !== undefined && { vip: m.vip }),
                        ...(m.email_client !== undefined && { email_client: m.email_client }),
                        ...(m.location !== undefined && { location: m.location }),
                        ...(m.source !== undefined && { source: m.source }),
                        ...(m.tags_count !== undefined && { tags_count: m.tags_count }),
                        ...(m.tags !== undefined && { tags: m.tags }),
                        ...(m.list_id !== undefined && { list_id: m.list_id })
                    });

                    if (m.last_changed && (!maxLastChanged || m.last_changed > maxLastChanged)) {
                        maxLastChanged = m.last_changed;
                    }
                }

                if (members.length > 0) {
                    await nango.batchSave(members, 'Member');
                }
            }
        }

        if (maxLastChanged !== undefined) {
            const nextUpdatedAfter = withOneSecondOverlap(maxLastChanged);

            if (nextUpdatedAfter !== updatedAfter) {
                await nango.saveCheckpoint({ updated_after: nextUpdatedAfter });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
