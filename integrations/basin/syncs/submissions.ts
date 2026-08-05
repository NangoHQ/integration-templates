import { createSync } from 'nango';
import { z } from 'zod';

interface FormItem {
    id: number;
    name: string;
    uuid?: string | undefined;
}

const FormItemSchema = z.object({
    id: z.number(),
    name: z.string(),
    uuid: z.string().optional()
});

interface ProviderSubmission {
    id: number;
    email?: string | undefined;
    source_url?: string | null | undefined;
    source_host?: string | null | undefined;
    source_path?: string | null | undefined;
    source_query?: string | null | undefined;
    source_fragment?: string | null | undefined;
    payload_params?: Record<string, unknown> | undefined;
    form_id: number;
    spam: boolean;
    created_at: string;
    updated_at: string;
    read: boolean;
    trash: boolean;
    spam_reason?: string | null | undefined;
    webhook_sent_at?: string | null | undefined;
    ip?: string | null | undefined;
    referrer?: string | null | undefined;
    user_agent?: string | null | undefined;
    geocoded_country?: string | undefined;
    geocoded_region?: string | undefined;
    geocoded_city?: string | undefined;
    attachments?: unknown[] | undefined;
    form?: { name?: string | undefined; uuid?: string | undefined } | undefined;
}

const ProviderSubmissionSchema = z.object({
    id: z.number(),
    email: z.string().optional(),
    source_url: z.string().nullable().optional(),
    source_host: z.string().nullable().optional(),
    source_path: z.string().nullable().optional(),
    source_query: z.string().nullable().optional(),
    source_fragment: z.string().nullable().optional(),
    payload_params: z.record(z.string(), z.unknown()).optional(),
    form_id: z.number(),
    spam: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    read: z.boolean(),
    trash: z.boolean(),
    spam_reason: z.string().nullable().optional(),
    webhook_sent_at: z.string().nullable().optional(),
    ip: z.string().nullable().optional(),
    referrer: z.string().nullable().optional(),
    user_agent: z.string().nullable().optional(),
    geocoded_country: z.string().optional(),
    geocoded_region: z.string().optional(),
    geocoded_city: z.string().optional(),
    attachments: z.array(z.unknown()).optional(),
    form: z
        .object({
            name: z.string().optional(),
            uuid: z.string().optional()
        })
        .optional()
});

interface SubmissionModel {
    [key: string]: unknown;
    id: string;
    email?: string | undefined;
    source_url?: string | undefined;
    source_host?: string | undefined;
    source_path?: string | undefined;
    source_query?: string | undefined;
    source_fragment?: string | undefined;
    payload_params?: Record<string, unknown> | undefined;
    form_id: number;
    spam: boolean;
    created_at: string;
    updated_at: string;
    read: boolean;
    trash: boolean;
    spam_reason?: string | undefined;
    webhook_sent_at?: string | undefined;
    ip?: string | undefined;
    referrer?: string | undefined;
    user_agent?: string | undefined;
    geocoded_country?: string | undefined;
    geocoded_region?: string | undefined;
    geocoded_city?: string | undefined;
    attachments?: unknown[] | undefined;
    form_name?: string | undefined;
    form_uuid?: string | undefined;
}

const SubmissionSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    source_url: z.string().optional(),
    source_host: z.string().optional(),
    source_path: z.string().optional(),
    source_query: z.string().optional(),
    source_fragment: z.string().optional(),
    payload_params: z.record(z.string(), z.unknown()).optional(),
    form_id: z.number(),
    spam: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
    read: z.boolean(),
    trash: z.boolean(),
    spam_reason: z.string().optional(),
    webhook_sent_at: z.string().optional(),
    ip: z.string().optional(),
    referrer: z.string().optional(),
    user_agent: z.string().optional(),
    geocoded_country: z.string().optional(),
    geocoded_region: z.string().optional(),
    geocoded_city: z.string().optional(),
    attachments: z.array(z.unknown()).optional(),
    form_name: z.string().optional(),
    form_uuid: z.string().optional()
});

const filters: readonly ['new', 'spam', 'trash'] = ['new', 'spam', 'trash'];

const CheckpointSchema = z.object({
    form_page: z.number().int().positive(),
    form_index: z.number().int().nonnegative(),
    filter_index: z
        .number()
        .int()
        .min(0)
        .max(filters.length - 1)
});

const sync = createSync({
    description: 'Sync submissions across all forms in this account',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Submission: SubmissionSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : null;

        if (!checkpoint) {
            // Basin paginates forms but exposes no incremental or deleted feed for submissions.
            await nango.trackDeletesStart('Submission');
        }

        const seenIds = new Set<string>();
        let formPage = checkpoint?.form_page ?? 1;
        const initialFormIndex = checkpoint?.form_index ?? 0;
        const initialFilterIndex = checkpoint?.filter_index ?? 0;

        while (true) {
            const formsResponse = await nango.get({
                // https://usebasin.com/api_docs/v1/swagger.yaml
                endpoint: '/v1/forms/',
                params: {
                    page: formPage,
                    per_page: 100
                },
                retries: 3
            });

            const parsedForms = z
                .object({
                    forms: z.array(FormItemSchema)
                })
                .safeParse(formsResponse.data);

            if (!parsedForms.success) {
                throw new Error(`Failed to parse forms page ${formPage}: ${parsedForms.error.message}`);
            }

            const forms: FormItem[] = parsedForms.data.forms;

            if (forms.length === 0) {
                break;
            }

            const pageFormStartIndex = formPage === (checkpoint?.form_page ?? 1) ? initialFormIndex : 0;

            for (let formIndex = pageFormStartIndex; formIndex < forms.length; formIndex += 1) {
                const form = forms[formIndex]!;
                const pageFilterStartIndex = formPage === (checkpoint?.form_page ?? 1) && formIndex === initialFormIndex ? initialFilterIndex : 0;

                for (let filterIndex = pageFilterStartIndex; filterIndex < filters.length; filterIndex += 1) {
                    const filterBy = filters[filterIndex]!;

                    // https://usebasin.com/api_docs/v1/swagger.yaml
                    const response = await nango.get({
                        endpoint: '/v1/submissions/',
                        params: {
                            form_id: String(form.id),
                            filter_by: filterBy
                        },
                        retries: 3
                    });

                    const envelope = z
                        .object({
                            submissions: z.array(z.unknown())
                        })
                        .safeParse(response.data);

                    if (!envelope.success) {
                        throw new Error(`Failed to parse submissions envelope for form ${form.id} filter ${filterBy}: ${envelope.error.message}`);
                    }

                    const submissions: SubmissionModel[] = [];

                    for (const raw of envelope.data.submissions) {
                        const parsed = ProviderSubmissionSchema.safeParse(raw);
                        if (!parsed.success) {
                            throw new Error(`Failed to parse submission for form ${form.id}: ${parsed.error.message}`);
                        }

                        const sub: ProviderSubmission = parsed.data;
                        const id = String(sub.id);
                        if (seenIds.has(id)) {
                            continue;
                        }
                        seenIds.add(id);

                        const mapped: SubmissionModel = {
                            id,
                            form_id: sub.form_id,
                            spam: sub.spam,
                            created_at: sub.created_at,
                            updated_at: sub.updated_at,
                            read: sub.read,
                            trash: sub.trash
                        };

                        if (sub.email != null) {
                            mapped.email = sub.email;
                        }
                        if (sub.source_url != null) {
                            mapped.source_url = sub.source_url;
                        }
                        if (sub.source_host != null) {
                            mapped.source_host = sub.source_host;
                        }
                        if (sub.source_path != null) {
                            mapped.source_path = sub.source_path;
                        }
                        if (sub.source_query != null) {
                            mapped.source_query = sub.source_query;
                        }
                        if (sub.source_fragment != null) {
                            mapped.source_fragment = sub.source_fragment;
                        }
                        if (sub.payload_params != null) {
                            mapped.payload_params = sub.payload_params;
                        }
                        if (sub.spam_reason != null) {
                            mapped.spam_reason = sub.spam_reason;
                        }
                        if (sub.webhook_sent_at != null) {
                            mapped.webhook_sent_at = sub.webhook_sent_at;
                        }
                        if (sub.ip != null) {
                            mapped.ip = sub.ip;
                        }
                        if (sub.referrer != null) {
                            mapped.referrer = sub.referrer;
                        }
                        if (sub.user_agent != null) {
                            mapped.user_agent = sub.user_agent;
                        }
                        if (sub.geocoded_country != null) {
                            mapped.geocoded_country = sub.geocoded_country;
                        }
                        if (sub.geocoded_region != null) {
                            mapped.geocoded_region = sub.geocoded_region;
                        }
                        if (sub.geocoded_city != null) {
                            mapped.geocoded_city = sub.geocoded_city;
                        }
                        if (sub.attachments != null) {
                            mapped.attachments = sub.attachments;
                        }
                        if (sub.form != null) {
                            if (sub.form.name != null) {
                                mapped.form_name = sub.form.name;
                            }
                            if (sub.form.uuid != null) {
                                mapped.form_uuid = sub.form.uuid;
                            }
                        }

                        submissions.push(mapped);
                    }

                    if (submissions.length > 0) {
                        await nango.batchSave(submissions, 'Submission');
                    }

                    if (filterIndex + 1 < filters.length) {
                        await nango.saveCheckpoint({
                            form_page: formPage,
                            form_index: formIndex,
                            filter_index: filterIndex + 1
                        });
                    } else if (formIndex + 1 < forms.length) {
                        await nango.saveCheckpoint({
                            form_page: formPage,
                            form_index: formIndex + 1,
                            filter_index: 0
                        });
                    } else {
                        await nango.saveCheckpoint({
                            form_page: formPage + 1,
                            form_index: 0,
                            filter_index: 0
                        });
                    }
                }
            }

            formPage += 1;
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Submission');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
