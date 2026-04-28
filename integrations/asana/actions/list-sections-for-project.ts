import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().min(1).describe('Globally unique identifier for the project. Example: "12345"'),
    cursor: z.string().optional().describe('Pagination cursor (offset token) from the previous response. Omit for the first page.')
});

const ProjectSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string()
});

const SectionSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string(),
    created_at: z.string().optional(),
    project: ProjectSchema.optional(),
    projects: z.array(ProjectSchema).optional()
});

const ListOutputSchema = z.object({
    items: z.array(SectionSchema),
    next_page_offset: z.string().optional()
});

const RawProjectSchema = z.object({
    gid: z.unknown(),
    resource_type: z.unknown(),
    name: z.unknown()
});

const RawSectionSchema = z.object({
    gid: z.unknown(),
    resource_type: z.unknown(),
    name: z.unknown(),
    created_at: z.unknown().optional(),
    project: z.unknown().optional(),
    projects: z.unknown().optional()
});

const RawNextPageSchema = z.object({
    offset: z.unknown()
});

const RawResponseSchema = z.object({
    data: z.array(z.unknown()),
    next_page: z.unknown().optional()
});

const action = createAction({
    description: 'List sections in a project.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-sections-for-project',
        group: 'Sections'
    },
    input: InputSchema,
    output: ListOutputSchema,
    scopes: ['projects:read'],

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        // https://developers.asana.com/reference/getsectionsforproject
        const response = await nango.get({
            endpoint: `/projects/${encodeURIComponent(input.project_id)}/sections`,
            params: {
                limit: '100',
                opt_fields:
                    'gid,resource_type,name,created_at,project.gid,project.resource_type,project.name,projects.gid,projects.resource_type,projects.name',
                ...(input.cursor && { offset: input.cursor })
            },
            retries: 3
        });

        const parsedResponse = RawResponseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Asana API'
            });
        }

        const rawData = parsedResponse.data;

        const sections = rawData.data.map((item) => {
            const parsedItem = RawSectionSchema.safeParse(item);
            if (!parsedItem.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Unexpected section item format from Asana API'
                });
            }

            const section = parsedItem.data;

            const parseProject = (raw: unknown) => {
                const parsed = RawProjectSchema.safeParse(raw);
                if (!parsed.success) {
                    return null;
                }
                return {
                    gid: String(parsed.data.gid ?? ''),
                    resource_type: String(parsed.data.resource_type ?? ''),
                    name: String(parsed.data.name ?? '')
                };
            };

            const project = section.project !== undefined ? parseProject(section.project) : undefined;
            const projects =
                section.projects !== undefined && Array.isArray(section.projects)
                    ? section.projects.map((p) => parseProject(p)).filter((p): p is { gid: string; resource_type: string; name: string } => p !== null)
                    : undefined;

            return {
                gid: String(section.gid ?? ''),
                resource_type: String(section.resource_type ?? ''),
                name: String(section.name ?? ''),
                ...(section.created_at !== undefined && { created_at: String(section.created_at) }),
                ...(project !== null && project !== undefined && { project }),
                ...(projects !== undefined && { projects })
            };
        });

        let nextPageOffset: string | undefined;
        if (rawData.next_page !== undefined && rawData.next_page !== null) {
            const parsedNextPage = RawNextPageSchema.safeParse(rawData.next_page);
            if (parsedNextPage.success && typeof parsedNextPage.data.offset === 'string') {
                nextPageOffset = parsedNextPage.data.offset;
            }
        }

        return {
            items: sections,
            ...(nextPageOffset !== undefined && { next_page_offset: nextPageOffset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
