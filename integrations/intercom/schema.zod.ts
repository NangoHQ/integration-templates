// Generated by ts-to-zod
import { z } from 'zod';

export const contactSchema = z.object({
    id: z.string(),
    workspace_id: z.string(),
    external_id: z.string().nullable(),
    type: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
    name: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    last_seen_at: z.string().nullable(),
    last_replied_at: z.string().nullable()
});

export const conversationSchema = z.object({
    id: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    waiting_since: z.string().nullable(),
    snoozed_until: z.string().nullable(),
    title: z.string().nullable(),
    contacts: z.array(
        z.object({
            contact_id: z.string()
        })
    ),
    state: z.string(),
    open: z.boolean(),
    read: z.boolean(),
    priority: z.string()
});

export const conversationMessageSchema = z.object({
    id: z.string(),
    conversation_id: z.string(),
    body: z.string(),
    type: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    author: z.object({
        type: z.string(),
        name: z.string(),
        id: z.string()
    })
});

export const articleContentSchema = z.object({
    type: z.string().nullable(),
    title: z.string(),
    description: z.string(),
    body: z.string(),
    author_id: z.number(),
    state: z.string(),
    created_at: z.number(),
    updated_at: z.number(),
    url: z.string()
});

export const translatedContentSchema = z.object({
    type: z.string().nullable(),
    ar: articleContentSchema.nullable(),
    bg: articleContentSchema.nullable(),
    bs: articleContentSchema.nullable(),
    ca: articleContentSchema.nullable(),
    cs: articleContentSchema.nullable(),
    da: articleContentSchema.nullable(),
    de: articleContentSchema.nullable(),
    el: articleContentSchema.nullable(),
    en: articleContentSchema.nullable(),
    es: articleContentSchema.nullable(),
    et: articleContentSchema.nullable(),
    fi: articleContentSchema.nullable(),
    fr: articleContentSchema.nullable(),
    he: articleContentSchema.nullable(),
    hr: articleContentSchema.nullable(),
    hu: articleContentSchema.nullable(),
    id: articleContentSchema.nullable(),
    it: articleContentSchema.nullable(),
    ja: articleContentSchema.nullable(),
    ko: articleContentSchema.nullable(),
    lt: articleContentSchema.nullable(),
    lv: articleContentSchema.nullable(),
    mn: articleContentSchema.nullable(),
    nb: articleContentSchema.nullable(),
    nl: articleContentSchema.nullable(),
    pl: articleContentSchema.nullable(),
    pt: articleContentSchema.nullable(),
    ro: articleContentSchema.nullable(),
    ru: articleContentSchema.nullable(),
    sl: articleContentSchema.nullable(),
    sr: articleContentSchema.nullable(),
    sv: articleContentSchema.nullable(),
    tr: articleContentSchema.nullable(),
    vi: articleContentSchema.nullable(),
    'pt-BR': articleContentSchema.nullable(),
    'zh-CN': articleContentSchema.nullable(),
    'zh-TW': articleContentSchema.nullable()
});

export const articleSchema = z.object({
    type: z.string(),
    id: z.string(),
    workspace_id: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    body: z.string().nullable(),
    author_id: z.number(),
    state: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    url: z.string().nullable(),
    parent_id: z.number().nullable(),
    parent_ids: z.array(z.number()),
    parent_type: z.string().nullable(),
    default_locale: z.union([z.string(), z.undefined()]).optional(),
    translated_content: z.union([translatedContentSchema, z.undefined()]).optional().nullable()
});