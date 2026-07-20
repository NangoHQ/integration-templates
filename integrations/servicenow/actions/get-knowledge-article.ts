import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sys_id: z.string().describe('The sys_id of the knowledge article. Example: "13bbf73987110300b66b5cdac5cb0bc5"')
});

const ReferenceFieldSchema = z.object({
    link: z.string(),
    value: z.string()
});

const ProviderKbKnowledgeSchema = z.object({
    sys_id: z.string(),
    number: z.string(),
    short_description: z.string().nullish(),
    text: z.string().nullish(),
    sys_created_on: z.string().nullish(),
    sys_updated_on: z.string().nullish(),
    workflow_state: z.string().nullish(),
    published: z.string().nullish(),
    author: z.union([z.string(), ReferenceFieldSchema]).nullish(),
    kb_category: z.union([z.string(), ReferenceFieldSchema]).nullish(),
    kb_knowledge_base: z.union([z.string(), ReferenceFieldSchema]).nullish()
});

const OutputSchema = z.object({
    sys_id: z.string(),
    number: z.string(),
    short_description: z.string().optional(),
    text: z.string().optional(),
    sys_created_on: z.string().optional(),
    sys_updated_on: z.string().optional(),
    workflow_state: z.string().optional(),
    published: z.string().optional(),
    author: z.string().optional(),
    kb_category: z.string().optional(),
    kb_knowledge_base: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a knowledge base article.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.servicenow.com/dev.do#!/reference/api/now-rest/knowledge-management/kb_knowledge
        const response = await nango.get({
            endpoint: `/api/now/table/kb_knowledge/${encodeURIComponent(input.sys_id)}`,
            params: {
                sysparm_display_value: 'false'
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || !('result' in response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Knowledge article not found or unexpected response format',
                sys_id: input.sys_id
            });
        }

        const rawResult = response.data.result;
        if (!rawResult || typeof rawResult !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Knowledge article result is empty',
                sys_id: input.sys_id
            });
        }

        const providerArticle = ProviderKbKnowledgeSchema.parse(rawResult);

        const extractReferenceValue = (field: string | { value: string } | null | undefined): string | undefined => {
            if (field == null) {
                return undefined;
            }
            if (typeof field === 'string') {
                return field;
            }
            return field.value;
        };

        return {
            sys_id: providerArticle.sys_id,
            number: providerArticle.number,
            ...(providerArticle.short_description != null && { short_description: providerArticle.short_description }),
            ...(providerArticle.text != null && { text: providerArticle.text }),
            ...(providerArticle.sys_created_on != null && { sys_created_on: providerArticle.sys_created_on }),
            ...(providerArticle.sys_updated_on != null && { sys_updated_on: providerArticle.sys_updated_on }),
            ...(providerArticle.workflow_state != null && { workflow_state: providerArticle.workflow_state }),
            ...(providerArticle.published != null && { published: providerArticle.published }),
            ...(providerArticle.author != null && { author: extractReferenceValue(providerArticle.author) }),
            ...(providerArticle.kb_category != null && { kb_category: extractReferenceValue(providerArticle.kb_category) }),
            ...(providerArticle.kb_knowledge_base != null && { kb_knowledge_base: extractReferenceValue(providerArticle.kb_knowledge_base) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
