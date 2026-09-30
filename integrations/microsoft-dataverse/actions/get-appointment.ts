import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        appointment_id: z
            .string()
            .describe(
                'The unique identifier (GUID) of the appointment to retrieve. Maps to the Dataverse `activityid` attribute. Example: "07bc32ab-7a25-eb11-a814-000d3a30f257"'
            ),
        select: z
            .array(z.string())
            .optional()
            .describe(
                'Optional list of appointment attribute (column) logical names to return, sent as the OData `$select` query option. Example: ["subject", "scheduledstart", "scheduledend"]. When omitted, all populated attributes of the appointment are returned.'
            )
    })
    .describe('Input for retrieving a single Dataverse appointment activity.');

const AppointmentSchema = z
    .object({
        activityid: z.string().describe('Unique identifier (GUID) of the appointment. Always returned, even when not listed in `select`.'),
        subject: z.string().nullable().optional().describe('Subject line of the appointment. Null when not set.'),
        description: z.string().nullable().optional().describe('Plain-text body of the appointment. Null when not set.'),
        location: z.string().nullable().optional().describe('Free-text location of the appointment. Null when not set.'),
        scheduledstart: z.string().nullable().optional().describe('Scheduled start time of the appointment as an ISO 8601 UTC timestamp. Null when not set.'),
        scheduledend: z.string().nullable().optional().describe('Scheduled end time of the appointment as an ISO 8601 UTC timestamp. Null when not set.'),
        actualstart: z.string().nullable().optional().describe('Actual start time of the appointment as an ISO 8601 UTC timestamp. Null when not set.'),
        actualend: z.string().nullable().optional().describe('Actual end time of the appointment as an ISO 8601 UTC timestamp. Null when not set.'),
        isalldayevent: z.boolean().nullable().optional().describe('Whether the appointment is an all-day event.'),
        scheduleddurationminutes: z.number().nullable().optional().describe('Scheduled duration of the appointment in minutes. Null when not set.'),
        actualdurationminutes: z.number().nullable().optional().describe('Actual duration of the appointment in minutes. Null when not set.'),
        statecode: z.number().nullable().optional().describe('State of the appointment: 0 = Open, 1 = Completed, 2 = Canceled, 3 = Scheduled.'),
        statuscode: z
            .number()
            .nullable()
            .optional()
            .describe('Detailed status reason of the appointment; the meaning of each code depends on the current statecode.'),
        createdon: z.string().optional().describe('ISO 8601 UTC timestamp of when the appointment record was created.'),
        modifiedon: z.string().optional().describe('ISO 8601 UTC timestamp of when the appointment record was last modified.'),
        _regardingobjectid_value: z
            .string()
            .nullable()
            .optional()
            .describe(
                'GUID of the record this appointment is regarding (for example an account, contact, or opportunity). Null when the appointment is not linked to a parent record.'
            ),
        _ownerid_value: z.string().nullable().optional().describe('GUID of the user or team that owns the appointment.')
    })
    .passthrough()
    .describe(
        'A Dataverse appointment activity record. When `select` is used, only the requested attributes (plus `activityid`) are present; otherwise all populated attributes are returned, including any custom or org-specific attributes not listed here.'
    );

/**
 * @tags: [read]
 * @tagReason: Performs a single GET request to read one appointment record and makes no provider-side changes.
 * @pitfalls: When `select` is provided, unrequested attributes are omitted but Dataverse still returns `activityid` and may include other unrequested attributes such as `isalldayevent`, while requested attributes with no value come back as explicit null. Requesting an unknown or deleted appointment id fails with a provider 404 error rather than returning an empty result.
 */
const action = createAction({
    description: 'Retrieve a single appointment activity by id.',
    version: '1.0.0',
    input: InputSchema,
    output: AppointmentSchema,

    exec: async (nango, input): Promise<z.infer<typeof AppointmentSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
            endpoint: `/api/data/v9.2/appointments(${encodeURIComponent(input.appointment_id)})`,
            params: {
                ...(input.select && input.select.length > 0 && { $select: input.select.join(',') })
            },
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = AppointmentSchema.parse(response.data);
        const { '@odata.context': _odataContext, ...appointment } = parsed;

        return appointment;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
