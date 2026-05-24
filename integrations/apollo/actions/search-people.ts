import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    person_titles: z.array(z.string()).optional().describe('Job titles to search for. Example: ["sales director", "vp sales"]'),
    person_seniorities: z.array(z.string()).optional().describe('Seniority levels to filter by. Example: ["c_suite", "director", "manager"]'),
    q_organization_domains_list: z.array(z.string()).optional().describe('Organization domains to filter by. Example: ["apollo.io", "nango.dev"]'),
    person_locations: z.array(z.string()).optional().describe('Person locations to filter by. Example: ["California, US", "New York, US"]'),
    organization_locations: z.array(z.string()).optional().describe('Organization headquarters locations. Example: ["California, US"]'),
    per_page: z.number().int().min(1).max(100).optional().describe('Number of results per page (1-100). Default: 25'),
    page: z.number().int().min(1).optional().describe('Page number for pagination. Default: 1')
});

const OrganizationSchema = z
    .object({
        name: z.string().optional(),
        domain: z.string().optional(),
        industry: z.string().optional()
    })
    .passthrough();

const PersonSchema = z
    .object({
        id: z.string(),
        first_name: z.string().optional().nullable(),
        last_name: z.string().optional().nullable(),
        name: z.string().optional(),
        title: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
        organization: OrganizationSchema.optional().nullable()
    })
    .passthrough();

const PaginationSchema = z
    .object({
        page: z.number().optional(),
        per_page: z.number().optional(),
        total_entries: z.number().optional(),
        total_pages: z.number().optional()
    })
    .passthrough();

const ProviderResponseSchema = z
    .object({
        people: z.array(PersonSchema).optional(),
        pagination: PaginationSchema.optional()
    })
    .passthrough();

const PersonOutputSchema = z.object({
    id: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    name: z.string().optional(),
    title: z.string().optional(),
    email: z.string().optional(),
    organization_name: z.string().optional(),
    organization_domain: z.string().optional()
});

const OutputSchema = z.object({
    people: z.array(PersonOutputSchema),
    pagination: z
        .object({
            page: z.number().optional(),
            per_page: z.number().optional(),
            total_entries: z.number().optional(),
            total_pages: z.number().optional(),
            next_page: z.number().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Search Apollo people records',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/search-people',
        group: 'People'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {};

        if (input.person_titles !== undefined && input.person_titles.length > 0) {
            requestBody['person_titles'] = input.person_titles;
        }
        if (input.person_seniorities !== undefined && input.person_seniorities.length > 0) {
            requestBody['person_seniorities'] = input.person_seniorities;
        }
        if (input.q_organization_domains_list !== undefined && input.q_organization_domains_list.length > 0) {
            requestBody['q_organization_domains_list'] = input.q_organization_domains_list;
        }
        if (input.person_locations !== undefined && input.person_locations.length > 0) {
            requestBody['person_locations'] = input.person_locations;
        }
        if (input.organization_locations !== undefined && input.organization_locations.length > 0) {
            requestBody['organization_locations'] = input.organization_locations;
        }
        if (input.per_page !== undefined) {
            requestBody['per_page'] = input.per_page;
        }
        if (input.page !== undefined) {
            requestBody['page'] = input.page;
        }

        // https://docs.apollo.io/reference/people-api-search
        const response = await nango.post({
            endpoint: '/v1/mixed_people/api_search',
            data: requestBody,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const people = parsed.people || [];
        const pagination = parsed.pagination;

        return {
            people: people.map((person) => ({
                id: person.id,
                ...(person.first_name != null ? { first_name: person.first_name } : {}),
                ...(person.last_name != null ? { last_name: person.last_name } : {}),
                ...(person.name != null ? { name: person.name } : {}),
                ...(person.title != null ? { title: person.title } : {}),
                ...(person.email != null ? { email: person.email } : {}),
                ...(person.organization?.name != null ? { organization_name: person.organization.name } : {}),
                ...(person.organization?.domain != null ? { organization_domain: person.organization.domain } : {})
            })),
            pagination: pagination
                ? {
                      page: pagination.page,
                      per_page: pagination.per_page,
                      total_entries: pagination.total_entries,
                      total_pages: pagination.total_pages,
                      next_page: pagination.page && pagination.total_pages && pagination.page < pagination.total_pages ? pagination.page + 1 : undefined
                  }
                : undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
