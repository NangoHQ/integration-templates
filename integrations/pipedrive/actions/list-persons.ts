import { z } from 'zod';
import { createAction } from 'nango';

const ListPersonsInputSchema = z.object({
    filter_id: z.number().optional().describe('If supplied, only persons matching the specified filter are returned'),
    owner_id: z.number().optional().describe('If supplied, only persons owned by the specified user are returned'),
    org_id: z.number().optional().describe('If supplied, only persons linked to the specified organization are returned'),
    deal_id: z.number().optional().describe('If supplied, only persons linked to the specified deal are returned'),
    updated_since: z
        .string()
        .optional()
        .describe('If set, only persons with an update_time later than or equal to this time are returned. In RFC3339 format, e.g. 2025-01-15T10:20:00Z'),
    updated_until: z
        .string()
        .optional()
        .describe('If set, only persons with an update_time earlier than this time are returned. In RFC3339 format, e.g. 2025-01-15T10:20:00Z'),
    sort_by: z.enum(['id', 'update_time', 'add_time']).optional().describe('The field to sort by. Defaults to id'),
    sort_direction: z.enum(['asc', 'desc']).optional().describe('The sorting direction. Defaults to asc'),
    limit: z.number().optional().describe('For pagination, the limit of entries to be returned. Maximum value of 500'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const PersonEmailSchema = z.object({
    value: z.string(),
    primary: z.boolean().optional(),
    label: z.string().optional()
});

const PersonPhoneSchema = z.object({
    value: z.string(),
    primary: z.boolean().optional(),
    label: z.string().optional()
});

const PersonLabelSchema = z.object({
    id: z.number(),
    label: z.string()
});

// The API returns org_id and owner_id as objects in v1
const OwnerObjectSchema = z.object({
    id: z.number(),
    name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    has_pic: z.number().optional().nullable(),
    pic_hash: z.string().optional().nullable(),
    active_flag: z.boolean().optional().nullable(),
    value: z.number()
});

const OrgObjectSchema = z.object({
    name: z.string().optional().nullable(),
    people_count: z.number().optional().nullable(),
    owner_id: z.number().optional().nullable(),
    address: z.string().optional().nullable(),
    cc_email: z.string().optional().nullable(),
    value: z.number()
});

const ProviderPersonSchema = z.object({
    id: z.number(),
    name: z.string().optional().nullable(),
    emails: z.array(PersonEmailSchema).optional().nullable(),
    phones: z.array(PersonPhoneSchema).optional().nullable(),
    org_id: z.union([z.number(), OrgObjectSchema]).optional().nullable(),
    owner_id: z.union([z.number(), OwnerObjectSchema]).optional().nullable(),
    add_time: z.string().optional().nullable(),
    update_time: z.string().optional().nullable(),
    visible_to: z.union([z.number(), z.string()]).optional().nullable(),
    label_ids: z.array(z.number()).optional().nullable(),
    labels: z.array(PersonLabelSchema).optional().nullable()
});

const ProviderPersonsResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(ProviderPersonSchema),
    additional_data: z
        .object({
            next_cursor: z.string().optional().nullable(),
            limit: z.number().optional().nullable(),
            total_count: z.number().optional().nullable()
        })
        .optional()
});

const PersonOutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    emails: z.array(PersonEmailSchema).optional(),
    phones: z.array(PersonPhoneSchema).optional(),
    org_id: z.number().optional(),
    org_name: z.string().optional(),
    owner_id: z.number().optional(),
    owner_name: z.string().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    visible_to: z.union([z.number(), z.string()]).optional(),
    label_ids: z.array(z.number()).optional(),
    labels: z.array(PersonLabelSchema).optional()
});

const ListPersonsOutputSchema = z.object({
    persons: z.array(PersonOutputSchema),
    next_cursor: z.string().optional().describe('Pagination cursor for the next page of results')
});

const action = createAction({
    description: 'List persons from Pipedrive',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-persons',
        group: 'Persons'
    },
    input: ListPersonsInputSchema,
    output: ListPersonsOutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListPersonsOutputSchema>> => {
        const params: Record<string, string | number | string[] | number[]> = {};

        if (input['filter_id'] !== undefined) {
            params['filter_id'] = input['filter_id'];
        }
        if (input['owner_id'] !== undefined) {
            params['owner_id'] = input['owner_id'];
        }
        if (input['org_id'] !== undefined) {
            params['org_id'] = input['org_id'];
        }
        if (input['deal_id'] !== undefined) {
            params['deal_id'] = input['deal_id'];
        }
        if (input['updated_since'] !== undefined) {
            params['updated_since'] = input['updated_since'];
        }
        if (input['updated_until'] !== undefined) {
            params['updated_until'] = input['updated_until'];
        }
        if (input['sort_by'] !== undefined) {
            params['sort_by'] = input['sort_by'];
        } else {
            params['sort_by'] = 'id';
        }
        if (input['sort_direction'] !== undefined) {
            params['sort_direction'] = input['sort_direction'];
        } else {
            params['sort_direction'] = 'asc';
        }
        if (input['limit'] !== undefined) {
            params['limit'] = input['limit'];
        }
        if (input['cursor'] !== undefined) {
            params['cursor'] = input['cursor'];
        }

        // https://developers.pipedrive.com/docs/api/v1/Persons#getPersons
        const response = await nango.get({
            endpoint: '/v1/persons',
            params,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Pipedrive API'
            });
        }

        const parsedResponse = ProviderPersonsResponseSchema.safeParse(response.data);

        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'parse_error',
                message: 'Failed to parse Pipedrive API response',
                details: parsedResponse.error.format()
            });
        }

        const { success, data, additional_data } = parsedResponse.data;

        if (!success) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Pipedrive API returned an unsuccessful response'
            });
        }

        const persons = data.map((person) => {
            const mappedPerson: z.infer<typeof PersonOutputSchema> = {
                id: person.id
            };

            if (person.name != null) {
                mappedPerson.name = person.name;
            }
            if (person.emails != null) {
                mappedPerson.emails = person.emails;
            }
            if (person.phones != null) {
                mappedPerson.phones = person.phones;
            }
            if (person.org_id != null) {
                if (typeof person.org_id === 'number') {
                    mappedPerson.org_id = person.org_id;
                } else if (typeof person.org_id === 'object' && person.org_id !== null) {
                    mappedPerson.org_id = person.org_id.value;
                    if (person.org_id.name != null) {
                        mappedPerson.org_name = person.org_id.name;
                    }
                }
            }
            if (person.owner_id != null) {
                if (typeof person.owner_id === 'number') {
                    mappedPerson.owner_id = person.owner_id;
                } else if (typeof person.owner_id === 'object' && person.owner_id !== null) {
                    mappedPerson.owner_id = person.owner_id.id;
                    if (person.owner_id.name != null) {
                        mappedPerson.owner_name = person.owner_id.name;
                    }
                }
            }
            if (person.add_time != null) {
                mappedPerson.add_time = person.add_time;
            }
            if (person.update_time != null) {
                mappedPerson.update_time = person.update_time;
            }
            if (person.visible_to != null) {
                mappedPerson.visible_to = person.visible_to;
            }
            if (person.label_ids != null) {
                mappedPerson.label_ids = person.label_ids;
            }
            if (person.labels != null) {
                mappedPerson.labels = person.labels;
            }

            return mappedPerson;
        });

        const result: z.infer<typeof ListPersonsOutputSchema> = {
            persons
        };

        if (additional_data?.next_cursor != null) {
            result.next_cursor = additional_data.next_cursor;
        }

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
