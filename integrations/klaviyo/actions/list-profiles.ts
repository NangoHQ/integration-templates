import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    filter: z.string().optional().describe("Filter query string. Example: equals(email,'john.doe@nangotest.dev')"),
    page_size: z.number().int().min(1).max(100).optional().describe('Number of results per page. Default is provider-specific.')
});

const ProviderProfileSchema = z.object({
    type: z.literal('profile'),
    id: z.string(),
    attributes: z
        .object({
            email: z.string().nullable().optional(),
            phone_number: z.string().nullable().optional(),
            external_id: z.string().nullable().optional(),
            anonymous_id: z.string().nullable().optional(),
            first_name: z.string().nullable().optional(),
            last_name: z.string().nullable().optional(),
            organization: z.string().nullable().optional(),
            title: z.string().nullable().optional(),
            image: z.string().nullable().optional(),
            created: z.string().optional(),
            updated: z.string().optional(),
            last_event_date: z.string().nullable().optional(),
            location: z.record(z.string(), z.unknown()).optional(),
            properties: z.record(z.string(), z.unknown()).optional(),
            predictive_analytics: z.record(z.string(), z.unknown()).optional()
        })
        .passthrough(),
    relationships: z.record(z.string(), z.unknown()).optional(),
    links: z.record(z.string(), z.unknown()).optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderProfileSchema),
    links: z
        .object({
            next: z.string().nullable().optional(),
            prev: z.string().nullable().optional(),
            self: z.string().optional()
        })
        .optional()
});

const ProfileOutputSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    phone_number: z.string().optional(),
    external_id: z.string().optional(),
    anonymous_id: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    organization: z.string().optional(),
    title: z.string().optional(),
    image: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
    last_event_date: z.string().optional(),
    location: z.record(z.string(), z.unknown()).optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
    predictive_analytics: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    items: z.array(ProfileOutputSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List profiles.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['profiles:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.cursor !== undefined) {
            params['page[cursor]'] = input.cursor;
        }
        if (input.filter !== undefined) {
            params['filter'] = input.filter;
        }
        if (input.page_size !== undefined) {
            params['page[size]'] = input.page_size;
        }

        const response = await nango.get({
            // https://developers.klaviyo.com/en/reference/get_profiles
            endpoint: '/api/profiles',
            params,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse Klaviyo list profiles response.',
                details: parsed.error.message
            });
        }

        let next_cursor: string | undefined;
        const nextUrl = parsed.data.links?.next;
        if (typeof nextUrl === 'string') {
            const match = nextUrl.match(/[?&]page(?:%5B|\[)cursor(?:%5D|\])=([^&]+)/);
            if (match && match[1]) {
                next_cursor = decodeURIComponent(match[1]);
            }
        }

        const items = parsed.data.data.map((profile) => ({
            id: profile.id,
            ...(profile.attributes.email != null && { email: profile.attributes.email }),
            ...(profile.attributes.phone_number != null && { phone_number: profile.attributes.phone_number }),
            ...(profile.attributes.external_id != null && { external_id: profile.attributes.external_id }),
            ...(profile.attributes.anonymous_id != null && { anonymous_id: profile.attributes.anonymous_id }),
            ...(profile.attributes.first_name != null && { first_name: profile.attributes.first_name }),
            ...(profile.attributes.last_name != null && { last_name: profile.attributes.last_name }),
            ...(profile.attributes.organization != null && { organization: profile.attributes.organization }),
            ...(profile.attributes.title != null && { title: profile.attributes.title }),
            ...(profile.attributes.image != null && { image: profile.attributes.image }),
            ...(profile.attributes.created != null && { created: profile.attributes.created }),
            ...(profile.attributes.updated != null && { updated: profile.attributes.updated }),
            ...(profile.attributes.last_event_date != null && { last_event_date: profile.attributes.last_event_date }),
            ...(profile.attributes.location != null && { location: profile.attributes.location }),
            ...(profile.attributes.properties != null && { properties: profile.attributes.properties }),
            ...(profile.attributes.predictive_analytics != null && { predictive_analytics: profile.attributes.predictive_analytics })
        }));

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
