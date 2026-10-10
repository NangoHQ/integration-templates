import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        account_id: z.number().int().positive().describe('Timely account ID. Discover it with list-accounts. Example: 1145787'),
        since: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .describe('Start of the reporting window (inclusive), as YYYY-MM-DD. Example: "2026-10-01"'),
        upto: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .describe('End of the reporting window (inclusive), as YYYY-MM-DD. Example: "2026-10-31"')
    })
    .describe('Arguments for retrieving a date-range time and cost report from Timely for a single account.');

const DurationSchema = z.object({
    hours: z.number().describe('Whole-hours component of the duration.'),
    minutes: z.number().describe('Minutes component of the duration (0-59).'),
    seconds: z.number().describe('Seconds component of the duration (0-59).'),
    formatted: z.string().describe('Human-readable duration. Example: "01:30"'),
    total_hours: z.number().describe('Total duration expressed in decimal hours. Example: 1.5'),
    total_seconds: z.number().describe('Total duration expressed in seconds.'),
    total_minutes: z.number().describe('Total duration expressed in minutes.')
});

const MoneySchema = z.object({
    fractional: z.number().describe('Amount in the smallest currency unit (e.g. cents).'),
    formatted: z.string().describe('Formatted amount including currency symbol. Example: "KSh0.00"'),
    amount: z.number().describe('Decimal amount of money.'),
    currency_code: z.string().describe('ISO 4217 currency code. Example: "kes"')
});

const ProjectReportSchema = z.object({
    project_id: z.number().int().describe('Project ID.'),
    project_name: z.string().describe('Project name.'),
    active: z.boolean().describe('Whether the project is currently active.'),
    rate_type: z.string().optional().describe('Billing rate type for the project. Example: "non-billable"'),
    billable: z.boolean().optional().describe('Whether time on this project is billable.'),
    duration: DurationSchema.describe('Total logged time on this project inside the window.'),
    estimated_duration: DurationSchema.optional().describe('Estimated duration for this project.'),
    billed_duration: DurationSchema.optional().describe('Billed time on this project inside the window.'),
    unbilled_duration: DurationSchema.optional().describe('Unbilled time on this project inside the window.'),
    billable_duration: DurationSchema.optional().describe('Billable time on this project inside the window.'),
    non_billable_duration: DurationSchema.optional().describe('Non-billable time on this project inside the window.'),
    cost: MoneySchema.optional().describe('Total cost attributed to this project inside the window.'),
    estimated_cost: MoneySchema.optional().describe('Estimated cost for this project.'),
    billed_cost: MoneySchema.optional().describe('Billed cost for this project inside the window.'),
    unbilled_cost: MoneySchema.optional().describe('Unbilled cost for this project inside the window.'),
    internal_cost: MoneySchema.optional().describe('Internal cost for this project inside the window.'),
    profit: MoneySchema.optional().describe('Profit for this project inside the window.'),
    profitability: z.number().optional().describe('Profitability ratio for this project inside the window.')
});

const ClientReportSchema = z.object({
    client_id: z.number().int().describe('Client ID.'),
    client_name: z.string().describe('Client name.'),
    duration: DurationSchema.describe("Total logged time across this client's projects inside the window."),
    estimated_duration: DurationSchema.optional().describe("Estimated duration across this client's projects."),
    billed_duration: DurationSchema.optional().describe("Billed time across this client's projects inside the window."),
    unbilled_duration: DurationSchema.optional().describe("Unbilled time across this client's projects inside the window."),
    billable_duration: DurationSchema.optional().describe("Billable time across this client's projects inside the window."),
    non_billable_duration: DurationSchema.optional().describe("Non-billable time across this client's projects inside the window."),
    cost: MoneySchema.optional().describe("Total cost across this client's projects inside the window."),
    estimated_cost: MoneySchema.optional().describe("Estimated cost across this client's projects."),
    billed_cost: MoneySchema.optional().describe("Billed cost across this client's projects inside the window."),
    unbilled_cost: MoneySchema.optional().describe("Unbilled cost across this client's projects inside the window."),
    internal_cost: MoneySchema.optional().describe("Internal cost across this client's projects inside the window."),
    profit: MoneySchema.optional().describe("Profit across this client's projects inside the window."),
    profitability: z.number().optional().describe("Profitability ratio across this client's projects inside the window."),
    projects: z.array(ProjectReportSchema).describe('Per-project breakdown for this client inside the window.')
});

const OutputSchema = z
    .object({
        since: z.string().describe('Start of the reported window (YYYY-MM-DD), echoed from the input.'),
        upto: z.string().describe('End of the reported window (YYYY-MM-DD), echoed from the input.'),
        clients: z.array(ClientReportSchema).describe('Per-client rollup with a nested project breakdown. Empty when no time was logged in the window.')
    })
    .describe('Date-range-scoped time and cost rollup grouped by client, each with a per-project breakdown.');

const RawDurationSchema = z.object({
    hours: z.number(),
    minutes: z.number(),
    seconds: z.number(),
    formatted: z.string(),
    total_hours: z.number(),
    total_seconds: z.number(),
    total_minutes: z.number()
});

const RawMoneySchema = z.object({
    fractional: z.number(),
    formatted: z.string(),
    amount: z.number(),
    currency_code: z.string()
});

const RawProjectSchema = z.object({
    id: z.number(),
    name: z.string(),
    active: z.boolean(),
    rate_type: z.string().nullish(),
    billable: z.boolean().nullish(),
    duration: RawDurationSchema,
    estimated_duration: RawDurationSchema.nullish(),
    billed_duration: RawDurationSchema.nullish(),
    unbilled_duration: RawDurationSchema.nullish(),
    billable_duration: RawDurationSchema.nullish(),
    non_billable_duration: RawDurationSchema.nullish(),
    cost: RawMoneySchema.nullish(),
    estimated_cost: RawMoneySchema.nullish(),
    billed_cost: RawMoneySchema.nullish(),
    unbilled_cost: RawMoneySchema.nullish(),
    internal_cost: RawMoneySchema.nullish(),
    profit: RawMoneySchema.nullish(),
    profitability: z.number().nullish()
});

const RawClientReportSchema = z.object({
    id: z.number(),
    name: z.string(),
    projects: z.array(RawProjectSchema),
    duration: RawDurationSchema,
    estimated_duration: RawDurationSchema.nullish(),
    billed_duration: RawDurationSchema.nullish(),
    unbilled_duration: RawDurationSchema.nullish(),
    billable_duration: RawDurationSchema.nullish(),
    non_billable_duration: RawDurationSchema.nullish(),
    cost: RawMoneySchema.nullish(),
    estimated_cost: RawMoneySchema.nullish(),
    billed_cost: RawMoneySchema.nullish(),
    unbilled_cost: RawMoneySchema.nullish(),
    internal_cost: RawMoneySchema.nullish(),
    profit: RawMoneySchema.nullish(),
    profitability: z.number().nullish()
});

const RawReportSchema = z.array(RawClientReportSchema);

/**
 * @tags: [read]
 * @tagReason: Fetches a date-range time and cost rollup from Timely; performs no provider mutation.
 * @pitfalls: Clients and projects with no logged time in the window are omitted entirely, so an empty clients array means no time was logged rather than an error; all duration and cost values are scoped to the window and are project-level sums with no individual time entries included.
 */
const action = createAction({
    description: 'Get a date-range-scoped rollup of logged time and cost, grouped by client then project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.timely.com/
            endpoint: `/1.1/${encodeURIComponent(String(input.account_id))}/reports`,
            params: {
                since: input.since,
                upto: input.upto
            },
            retries: 3
        };

        const response = await nango.get(config);
        const rawClients = RawReportSchema.parse(response.data);

        const toNullable = <T>(value: T | null | undefined): T | undefined => (value == null ? undefined : value);

        return {
            since: input.since,
            upto: input.upto,
            clients: rawClients.map((client) => ({
                client_id: client.id,
                client_name: client.name,
                duration: client.duration,
                estimated_duration: toNullable(client.estimated_duration),
                billed_duration: toNullable(client.billed_duration),
                unbilled_duration: toNullable(client.unbilled_duration),
                billable_duration: toNullable(client.billable_duration),
                non_billable_duration: toNullable(client.non_billable_duration),
                cost: toNullable(client.cost),
                estimated_cost: toNullable(client.estimated_cost),
                billed_cost: toNullable(client.billed_cost),
                unbilled_cost: toNullable(client.unbilled_cost),
                internal_cost: toNullable(client.internal_cost),
                profit: toNullable(client.profit),
                profitability: toNullable(client.profitability),
                projects: client.projects.map((project) => ({
                    project_id: project.id,
                    project_name: project.name,
                    active: project.active,
                    rate_type: toNullable(project.rate_type),
                    billable: toNullable(project.billable),
                    duration: project.duration,
                    estimated_duration: toNullable(project.estimated_duration),
                    billed_duration: toNullable(project.billed_duration),
                    unbilled_duration: toNullable(project.unbilled_duration),
                    billable_duration: toNullable(project.billable_duration),
                    non_billable_duration: toNullable(project.non_billable_duration),
                    cost: toNullable(project.cost),
                    estimated_cost: toNullable(project.estimated_cost),
                    billed_cost: toNullable(project.billed_cost),
                    unbilled_cost: toNullable(project.unbilled_cost),
                    internal_cost: toNullable(project.internal_cost),
                    profit: toNullable(project.profit),
                    profitability: toNullable(project.profitability)
                }))
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
