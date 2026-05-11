import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const TagSchema = z.object({
    type: z.string().optional(),
    id: z.string(),
    name: z.string(),
    applied_to: z
        .object({
            contacts: z.number().optional(),
            companies: z.number().optional(),
            conversations: z.number().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(TagSchema),
    next_cursor: z.string().optional()
});

const ProviderTagSchema = z.object({
    type: z.string().optional(),
    id: z.string(),
    name: z.string(),
    applied_to: z
        .object({
            contacts: z.number().optional(),
            companies: z.number().optional(),
            conversations: z.number().optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    type: z.string().optional(),
    data: z.array(ProviderTagSchema),
    pages: z
        .object({
            next: z
                .object({
                    starting_after: z.string().optional()
                })
                .nullable()
                .optional()
        })
        .optional()
});

const action = createAction({
    description: 'List all tags in the workspace.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-tags',
        group: 'Tags'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tags'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Tags
        const response = await nango.get({
            endpoint: '/tags',
            params: {
                per_page: '150',
                ...(input.cursor && { starting_after: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Intercom API'
            });
        }

        const items = parsed.data.data.map((tag) => ({
            type: tag.type,
            id: tag.id,
            name: tag.name,
            applied_to: tag.applied_to
                ? {
                      contacts: tag.applied_to.contacts,
                      companies: tag.applied_to.companies,
                      conversations: tag.applied_to.conversations
                  }
                : undefined
        }));

        return {
            items,
            ...(parsed.data.pages?.next?.starting_after && { next_cursor: parsed.data.pages.next.starting_after })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
