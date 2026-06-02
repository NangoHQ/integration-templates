import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    contactId: z.number().describe('Contact ID. Example: 1'),
    tagId: z.number().describe('Tag ID. Example: 1')
});

const ProviderContactTagSchema = z.object({
    id: z.union([z.string(), z.number()]),
    contact: z.union([z.string(), z.number()]),
    tag: z.union([z.string(), z.number()]),
    cdate: z.string().optional(),
    links: z.object({}).passthrough().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    contactId: z.string(),
    tagId: z.string(),
    createdAt: z.string().optional()
});

const action = createAction({
    description: 'Apply a tag to an ActiveCampaign contact.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/tag-contact',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.activecampaign.com/reference/create-contact-tag
            endpoint: '/3/contactTags',
            data: {
                contactTag: {
                    contact: input.contactId,
                    tag: input.tagId
                }
            },
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object' || !('contactTag' in raw)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Provider response did not contain expected contactTag object.'
            });
        }

        const providerContactTag = ProviderContactTagSchema.parse(raw.contactTag);

        return {
            id: String(providerContactTag.id),
            contactId: String(providerContactTag.contact),
            tagId: String(providerContactTag.tag),
            ...(providerContactTag.cdate != null && { createdAt: providerContactTag.cdate })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
