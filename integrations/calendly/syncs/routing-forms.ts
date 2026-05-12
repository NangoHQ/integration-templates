import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RoutingFormQuestionSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    type: z.string(),
    required: z.boolean(),
    answer_choices: z.array(z.string()).nullable()
});

const RoutingFormSchema = z.object({
    id: z.string(),
    uri: z.string(),
    organization: z.string(),
    name: z.string(),
    status: z.string(),
    questions: z.array(RoutingFormQuestionSchema),
    created_at: z.string(),
    updated_at: z.string()
});

const CheckpointSchema = z.object({
    page_token: z.string()
});

const UserMeSchema = z.object({
    resource: z.object({
        current_organization: z.string()
    })
});

const ProviderRoutingFormSchema = z.object({
    uri: z.string(),
    organization: z.string(),
    name: z.string(),
    status: z.string(),
    questions: z.array(RoutingFormQuestionSchema),
    created_at: z.string(),
    updated_at: z.string()
});

const sync = createSync({
    description: 'Sync routing forms from Calendly',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        RoutingForm: RoutingFormSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/routing-forms'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(checkpoint ?? { page_token: '' });
        if (!checkpointResult.success) {
            throw new Error('Invalid checkpoint schema');
        }

        let pageToken = checkpointResult.data.page_token || undefined;

        // https://developer.calendly.com/api-docs/3c9e1b504029e-get-current-user
        const meResponse = await nango.get({
            endpoint: '/users/me',
            retries: 3
        });

        const meResult = UserMeSchema.safeParse(meResponse.data);
        if (!meResult.success) {
            throw new Error('Failed to parse /users/me response to discover organization');
        }

        const organization = meResult.data.resource.current_organization;

        await nango.trackDeletesStart('RoutingForm');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.calendly.com/api-docs/c71fced0d8733-list-routing-forms
            endpoint: '/routing_forms',
            params: {
                organization: organization,
                sort: 'created_at:asc',
                ...(pageToken !== undefined ? { page_token: pageToken } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'page_token',
                cursor_path_in_response: 'pagination.next_page_token',
                response_path: 'collection',
                limit_name_in_request: 'count',
                limit: 100,
                on_page: async (paginationState) => {
                    pageToken = typeof paginationState.nextPageParam === 'string' ? paginationState.nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const forms of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderRoutingFormSchema).safeParse(forms);
            if (!parsed.success) {
                throw new Error('Failed to parse routing forms from provider response');
            }

            const routingForms = parsed.data.map((form) => {
                const id = form.uri.split('/').pop() ?? form.uri;
                return {
                    id: id,
                    uri: form.uri,
                    organization: form.organization,
                    name: form.name,
                    status: form.status,
                    questions: form.questions,
                    created_at: form.created_at,
                    updated_at: form.updated_at
                };
            });

            if (routingForms.length > 0) {
                await nango.batchSave(routingForms, 'RoutingForm');
            }

            if (pageToken !== undefined) {
                await nango.saveCheckpoint({ page_token: pageToken });
            }
        }

        await nango.trackDeletesEnd('RoutingForm');
        await nango.saveCheckpoint({ page_token: '' });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
