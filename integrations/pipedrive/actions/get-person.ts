import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    person_id: z.number().describe('The ID of the person to retrieve. Example: 123')
});

const ProviderEmailSchema = z.object({
    value: z.string(),
    primary: z.boolean().optional(),
    label: z.string().optional()
});

const ProviderPhoneSchema = z.object({
    value: z.string(),
    primary: z.boolean().optional(),
    label: z.string().optional()
});

const ProviderOwnerSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    email: z.string().optional(),
    has_pic: z.number().optional(),
    pic_hash: z.string().nullable().optional(),
    active_flag: z.boolean().optional()
});

const ProviderOrgSchema = z.object({
    name: z.string(),
    people_count: z.number().optional(),
    owner_id: z.number().optional(),
    address: z.string().nullable().optional(),
    label_ids: z.array(z.number()).optional(),
    active_flag: z.boolean().optional(),
    cc_email: z.string().optional(),
    owner_name: z.string().optional(),
    value: z.number().optional()
});

const ProviderPersonSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    owner_id: z.union([z.number(), ProviderOwnerSchema]).nullable().optional(),
    org_id: z.union([z.number(), ProviderOrgSchema]).nullable().optional(),
    emails: z.array(ProviderEmailSchema).nullable().optional(),
    phones: z.array(ProviderPhoneSchema).nullable().optional(),
    add_time: z.string().nullable().optional(),
    update_time: z.string().nullable().optional(),
    visible_to: z.union([z.number(), z.string()]).nullable().optional(),
    label_ids: z.array(z.number()).nullable().optional(),
    active: z.boolean().nullable().optional(),
    deleted: z.boolean().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    owner_id: z.union([z.number(), ProviderOwnerSchema]).optional(),
    org_id: z.union([z.number(), ProviderOrgSchema]).optional(),
    emails: z.array(ProviderEmailSchema).optional(),
    phones: z.array(ProviderPhoneSchema).optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    visible_to: z.union([z.number(), z.string()]).optional(),
    label_ids: z.array(z.number()).optional(),
    active: z.boolean().optional(),
    deleted: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a single person from Pipedrive.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-person',
        group: 'Persons'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const baseUrl = connection.connection_config?.['api_domain'] || 'https://api.pipedrive.com';

        // https://developers.pipedrive.com/docs/api/v1/Persons#getPerson
        const response = await nango.get({
            endpoint: `/api/v1/persons/${input.person_id}`,
            baseUrlOverride: baseUrl,
            retries: 3
        });

        if (!response.data || !response.data.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Person with ID ${input.person_id} not found`,
                person_id: input.person_id
            });
        }

        const person = ProviderPersonSchema.parse(response.data.data);

        return {
            id: person.id,
            ...(person.name != null && { name: person.name }),
            ...(person.owner_id != null && { owner_id: person.owner_id }),
            ...(person.org_id != null && { org_id: person.org_id }),
            ...(person.emails != null && { emails: person.emails }),
            ...(person.phones != null && { phones: person.phones }),
            ...(person.add_time != null && { add_time: person.add_time }),
            ...(person.update_time != null && { update_time: person.update_time }),
            ...(person.visible_to != null && { visible_to: person.visible_to }),
            ...(person.label_ids != null && { label_ids: person.label_ids }),
            ...(person.active != null && { active: person.active }),
            ...(person.deleted != null && { deleted: person.deleted })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
