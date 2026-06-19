import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const EmailSchema = z.object({
    value: z.string(),
    primary: z.boolean().optional(),
    label: z.string().optional()
});

const PhoneSchema = z.object({
    value: z.string(),
    primary: z.boolean().optional(),
    label: z.string().optional()
});

const InputSchema = z.object({
    id: z.number().describe('The ID of the person to update'),
    name: z.string().optional().describe('The name of the person'),
    owner_id: z.number().optional().describe('The ID of the user who owns the person'),
    org_id: z.number().optional().describe('The ID of the organization linked to the person'),
    emails: z.array(EmailSchema).optional().describe('The emails of the person'),
    phones: z.array(PhoneSchema).optional().describe('The phones of the person'),
    visible_to: z.number().optional().describe('The visibility of the person'),
    label_ids: z.array(z.number()).optional().describe('The IDs of labels assigned to the person')
});

const OwnerIdSchema = z.union([
    z.number(),
    z.object({
        id: z.number(),
        name: z.string().optional(),
        email: z.string().optional()
    })
]);

const OrgIdSchema = z.union([
    z.number().nullable(),
    z
        .object({
            id: z.number(),
            name: z.string().optional()
        })
        .nullable()
]);

const ProviderPersonSchema = z.object({
    id: z.number(),
    name: z.string().nullable().optional(),
    owner_id: OwnerIdSchema.optional(),
    org_id: OrgIdSchema.optional(),
    emails: z.array(EmailSchema).nullable().optional(),
    phones: z.array(PhoneSchema).nullable().optional(),
    visible_to: z.union([z.number(), z.string()]).nullable().optional(),
    add_time: z.string().nullable().optional(),
    update_time: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    owner_id: z.number().optional(),
    org_id: z.number().optional(),
    emails: z.array(EmailSchema).optional(),
    phones: z.array(PhoneSchema).optional(),
    visible_to: z.number().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional()
});

const action = createAction({
    description: 'Update a person in Pipedrive',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deals:write', 'contacts:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: Record<string, unknown> = {};

        if (input.name !== undefined) {
            data['name'] = input.name;
        }
        if (input.owner_id !== undefined) {
            data['owner_id'] = input.owner_id;
        }
        if (input.org_id !== undefined) {
            data['org_id'] = input.org_id;
        }
        if (input.emails !== undefined) {
            data['emails'] = input.emails;
        }
        if (input.phones !== undefined) {
            data['phones'] = input.phones;
        }
        if (input.visible_to !== undefined) {
            data['visible_to'] = input.visible_to;
        }
        if (input.label_ids !== undefined) {
            data['label_ids'] = input.label_ids;
        }

        const config: ProxyConfiguration = {
            // https://developers.pipedrive.com/docs/api/v1/Persons#updatePerson
            endpoint: `/v1/persons/${input.id}`,
            data: data,
            retries: 3
        };

        const response = await nango.put(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Person not found or update failed',
                person_id: input.id
            });
        }

        const responseData = z
            .object({
                data: ProviderPersonSchema
            })
            .parse(response.data);

        const providerPerson = responseData.data;

        const ownerIdValue = providerPerson.owner_id;
        const ownerIdNumber = typeof ownerIdValue === 'object' && ownerIdValue !== null ? ownerIdValue.id : ownerIdValue;

        const orgIdValue = providerPerson.org_id;
        const orgIdNumber = typeof orgIdValue === 'object' && orgIdValue !== null ? orgIdValue.id : orgIdValue;

        const visibleToValue = providerPerson.visible_to;
        const visibleToNumber = typeof visibleToValue === 'string' ? parseInt(visibleToValue, 10) : visibleToValue;

        const result: z.infer<typeof OutputSchema> = {
            id: providerPerson.id,
            ...(providerPerson.name != null && { name: providerPerson.name }),
            ...(ownerIdNumber != null && { owner_id: ownerIdNumber }),
            ...(orgIdNumber != null && { org_id: orgIdNumber }),
            ...(providerPerson.emails != null && { emails: providerPerson.emails }),
            ...(providerPerson.phones != null && { phones: providerPerson.phones }),
            ...(visibleToNumber != null && { visible_to: visibleToNumber }),
            ...(providerPerson.add_time != null && { add_time: providerPerson.add_time }),
            ...(providerPerson.update_time != null && { update_time: providerPerson.update_time })
        };

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
