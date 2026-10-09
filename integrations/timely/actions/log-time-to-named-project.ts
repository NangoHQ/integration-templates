import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        project_name: z.string().describe('Exact, case-sensitive name of the project to log time against. A project with this name is created if none exists.'),
        day: z.string().describe('Day the time entry applies to, in YYYY-MM-DD format. Example: "2026-10-09".'),
        hours: z.number().int().min(0).optional().describe('Whole hours to log. Defaults to 0 when omitted.'),
        minutes: z.number().int().min(0).max(59).optional().describe('Additional minutes to log. Defaults to 0 when omitted.'),
        note: z.string().optional().describe('Optional note attached to the time entry.'),
        company_id: z
            .number()
            .int()
            .optional()
            .describe('Client (company) id the project is created under. Required only when a new project must be created and client_name is not supplied.'),
        client_name: z
            .string()
            .optional()
            .describe('Exact client name resolved to a company id when creating a new project. Used only when company_id is omitted.'),
        rate_type: z.string().optional().describe('Rate type for a newly-created project. Defaults to "non-billable".'),
        account_id: z.number().int().optional().describe('Timely account id. Defaults to the first account visible to the connection.')
    })
    .describe('Input for logging time against a named project, creating the project if it does not already exist.');

const ProviderAccountSchema = z.object({
    id: z.number(),
    name: z.string()
});

const ProviderProjectSchema = z.object({
    id: z.number(),
    name: z.string()
});

const ProviderClientSchema = z.object({
    id: z.number(),
    name: z.string()
});

const ProviderDurationSchema = z.object({
    hours: z.number(),
    minutes: z.number(),
    total_hours: z.number()
});

const ProviderEventSchema = z.object({
    id: z.number(),
    day: z.string(),
    note: z.string().nullable(),
    project: z.object({
        id: z.number()
    }),
    duration: ProviderDurationSchema
});

const EventOutputSchema = z.object({
    id: z.number().describe('Timely event (time entry) id.'),
    day: z.string().describe('Day the time entry applies to, in YYYY-MM-DD format.'),
    hours: z.number().describe('Whole hours component of the logged duration.'),
    minutes: z.number().describe('Minutes component of the logged duration.'),
    total_hours: z.number().describe('Total logged duration in decimal hours (e.g. 1.5 for 1h30m).'),
    project_id: z.number().describe('Id of the project the time entry was logged against.'),
    note: z.string().optional().describe('Note attached to the time entry, when present.')
});

const OutputSchema = z
    .object({
        account_id: z.number().describe('Timely account id the time was logged in.'),
        project_id: z.number().describe('Id of the project the time was logged against.'),
        project_name: z.string().describe('Name of the project the time was logged against.'),
        created_project: z.boolean().describe('True when a new project was created, false when an existing project with the same name was reused.'),
        event: EventOutputSchema.describe('The time entry that was created.')
    })
    .describe('Result of logging the time entry, including whether a new project was created or an existing one was reused.');

/**
 * @tags: [read, write]
 * @tagReason: Reads accounts, projects and clients to resolve the target project and client, then creates a project if missing and logs a new time entry.
 * @pitfalls: Project names are matched case-sensitively, so a differently-cased existing name creates a duplicate project instead of reusing it; when account_id is omitted the first account visible to the connection is used, and when neither company_id nor client_name is given the account's first client is used as the default, either of which may target the wrong account or client on multi-account or multi-client connections; omitting both hours and minutes logs a zero-duration entry.
 */
const action = createAction({
    description:
        'Log time against a project identified by name, creating the project first (under a given or default client) if no project with that exact name already exists.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let accountId = input.account_id;
        if (accountId === undefined) {
            // https://developer.timely.com/
            const accountsResponse = await nango.get({
                endpoint: '/1.1/accounts',
                retries: 3
            });
            const accounts = z.array(ProviderAccountSchema).parse(accountsResponse.data);
            const firstAccount = accounts[0];
            if (!firstAccount) {
                throw new nango.ActionError({
                    type: 'no_account',
                    message: 'No account is visible to this connection; pass account_id explicitly.'
                });
            }
            accountId = firstAccount.id;
        }

        // https://developer.timely.com/
        const projectsResponse = await nango.get({
            endpoint: `/1.1/${accountId}/projects`,
            retries: 3
        });
        const projects = z.array(ProviderProjectSchema).parse(projectsResponse.data);
        const existingProject = projects.find((project) => project.name === input.project_name);

        let projectId: number;
        let createdProject: boolean;

        if (existingProject) {
            projectId = existingProject.id;
            createdProject = false;
        } else {
            let companyId = input.company_id;
            if (companyId === undefined) {
                // https://developer.timely.com/
                const clientsResponse = await nango.get({
                    endpoint: `/1.1/${accountId}/clients`,
                    retries: 3
                });
                const clients = z.array(ProviderClientSchema).parse(clientsResponse.data);
                if (input.client_name !== undefined) {
                    const matchedClient = clients.find((client) => client.name === input.client_name);
                    if (!matchedClient) {
                        throw new nango.ActionError({
                            type: 'client_not_found',
                            message: `No client named "${input.client_name}" was found.`,
                            client_name: input.client_name
                        });
                    }
                    companyId = matchedClient.id;
                } else {
                    const defaultClient = clients[0];
                    if (!defaultClient) {
                        throw new nango.ActionError({
                            type: 'no_client',
                            message: 'A project must belong to a client, but no client is available; pass company_id.'
                        });
                    }
                    companyId = defaultClient.id;
                }
            }

            // https://developer.timely.com/
            const createProjectResponse = await nango.post({
                endpoint: `/1.1/${accountId}/projects`,
                data: {
                    project: {
                        name: input.project_name,
                        rate_type: input.rate_type ?? 'non-billable',
                        company_id: companyId
                    }
                },
                // Creating a project is not idempotent; a retry after a lost response would create a duplicate.
                // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
                retries: 0
            });
            const createdProjectResponse = ProviderProjectSchema.parse(createProjectResponse.data);
            projectId = createdProjectResponse.id;
            createdProject = true;
        }

        // https://developer.timely.com/
        const createEventResponse = await nango.post({
            endpoint: `/1.1/${accountId}/events`,
            data: {
                event: {
                    day: input.day,
                    project_id: projectId,
                    hours: input.hours ?? 0,
                    minutes: input.minutes ?? 0,
                    ...(input.note !== undefined && { note: input.note })
                }
            },
            // Logging time is not idempotent; a retry after a lost response would log duplicate time.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });
        const event = ProviderEventSchema.parse(createEventResponse.data);

        return {
            account_id: accountId,
            project_id: projectId,
            project_name: input.project_name,
            created_project: createdProject,
            event: {
                id: event.id,
                day: event.day,
                hours: event.duration.hours,
                minutes: event.duration.minutes,
                total_hours: event.duration.total_hours,
                project_id: event.project.id,
                ...(event.note !== null && { note: event.note })
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
