import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const DEFAULT_SELECT = [
    'activityid',
    'subject',
    'description',
    'phonenumber',
    'directioncode',
    'scheduledstart',
    'scheduledend',
    'actualstart',
    'actualend',
    'scheduleddurationminutes',
    'actualdurationminutes',
    'prioritycode',
    'statecode',
    'statuscode',
    'leftvoicemail',
    'createdon',
    'modifiedon',
    '_regardingobjectid_value',
    '_ownerid_value'
];

const InputSchema = z
    .object({
        select: z
            .array(z.string())
            .optional()
            .describe(
                'OData $select field names to return (e.g. ["subject", "phonenumber"]), including custom phone call fields. Omit to return the default curated field set. activityid is always returned by the provider. Fields outside the curated output schema are passed through unchanged.'
            ),
        filter: z.string().optional().describe('OData $filter expression to restrict which phone calls are returned (e.g. "statecode eq 0" for open calls).'),
        orderby: z.string().optional().describe('OData $orderby expression to sort results (e.g. "scheduledstart desc").'),
        top: z.number().int().positive().optional().describe('Maximum number of phone calls to return (OData $top). Must be a positive integer.')
    })
    .describe('Filters for listing Dataverse phone call activities. All fields are optional.');

const PhoneCallSchema = z
    .looseObject({
        id: z.string().describe('Unique identifier of the phone call activity (activityid). Example: "1d1d5314-ed24-eb11-a814-000d3a30f257".'),
        subject: z.string().optional().describe('Subject line of the phone call.'),
        description: z.string().optional().describe('Free-text body or notes for the phone call.'),
        phonenumber: z.string().optional().describe('Phone number the call was placed to or received from. Example: "930-555-0168".'),
        directioncode: z.boolean().optional().describe('Direction of the call: true = incoming, false = outgoing.'),
        scheduledstart: z.string().optional().describe('Scheduled start of the call as an ISO 8601 UTC timestamp. Example: "2026-09-14T04:00:00Z".'),
        scheduledend: z.string().optional().describe('Scheduled end of the call as an ISO 8601 UTC timestamp. Example: "2026-09-14T04:02:00Z".'),
        actualstart: z.string().optional().describe('Actual start of the call as an ISO 8601 UTC timestamp.'),
        actualend: z.string().optional().describe('Actual end of the call as an ISO 8601 UTC timestamp.'),
        scheduleddurationminutes: z.number().int().optional().describe('Scheduled duration of the call in minutes.'),
        actualdurationminutes: z.number().int().optional().describe('Actual duration of the call in minutes.'),
        prioritycode: z.number().int().optional().describe('Priority option-set code: 0 = Low, 1 = Normal, 2 = High.'),
        statecode: z.number().int().optional().describe('State option-set code: 0 = Open, 1 = Completed, 2 = Canceled.'),
        statuscode: z.number().int().optional().describe('Status reason option-set code (e.g. 1 = Open, 2 = Made, 4 = Received).'),
        leftvoicemail: z.boolean().optional().describe('Whether a voicemail was left on the call.'),
        createdon: z.string().optional().describe('Timestamp when the record was created as an ISO 8601 UTC timestamp.'),
        modifiedon: z.string().optional().describe('Timestamp when the record was last modified as an ISO 8601 UTC timestamp.'),
        _regardingobjectid_value: z.string().optional().describe('Id of the related record (account, contact, opportunity, etc.) the call regards.'),
        _ownerid_value: z.string().optional().describe('Id of the owning user or team.')
    })
    .describe(
        'A Dataverse phone call activity. Attributes beyond the ones listed, including custom phone call fields, depend on the select input and are passed through unchanged.'
    );

const OutputSchema = z
    .object({
        phone_calls: z.array(PhoneCallSchema).describe('Phone call activities matching the query.'),
        next_link: z
            .string()
            .optional()
            .describe('Absolute URL of the next results page (@odata.nextLink); present only when the server paginates a large result set.')
    })
    .describe('List of Dataverse phone call activities.');

const KNOWN_PHONE_CALL_KEYS = new Set([
    'activityid',
    'subject',
    'description',
    'phonenumber',
    'directioncode',
    'scheduledstart',
    'scheduledend',
    'actualstart',
    'actualend',
    'scheduleddurationminutes',
    'actualdurationminutes',
    'prioritycode',
    'statecode',
    'statuscode',
    'leftvoicemail',
    'createdon',
    'modifiedon',
    '_regardingobjectid_value',
    '_ownerid_value'
]);

const ProviderPhoneCallSchema = z.looseObject({
    activityid: z.string(),
    subject: z.string().nullish(),
    description: z.string().nullish(),
    phonenumber: z.string().nullish(),
    directioncode: z.boolean().nullish(),
    scheduledstart: z.string().nullish(),
    scheduledend: z.string().nullish(),
    actualstart: z.string().nullish(),
    actualend: z.string().nullish(),
    scheduleddurationminutes: z.number().int().nullish(),
    actualdurationminutes: z.number().int().nullish(),
    prioritycode: z.number().int().nullish(),
    statecode: z.number().int().nullish(),
    statuscode: z.number().int().nullish(),
    leftvoicemail: z.boolean().nullish(),
    createdon: z.string().nullish(),
    modifiedon: z.string().nullish(),
    _regardingobjectid_value: z.string().nullish(),
    _ownerid_value: z.string().nullish()
});

const ProviderListResponseSchema = z.object({
    value: z.array(ProviderPhoneCallSchema),
    '@odata.nextLink': z.string().optional()
});

/**
 * @tags: [read]
 * @tagReason: Only performs a GET list request against Dataverse phone call activities; it mutates nothing in the provider.
 * @pitfalls: Fields with null values are omitted from each record rather than returned as null. top is the only way to limit results; if the server paginates a large result set, only the first page is returned and the action provides no input to follow next_link.
 */
const action = createAction({
    description: 'List Dataverse phone call activities.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/query-data-web-api
            endpoint: '/api/data/v9.2/phonecalls',
            params: {
                $select: (input.select && input.select.length > 0 ? input.select : DEFAULT_SELECT).join(','),
                ...(input.filter !== undefined && { $filter: input.filter }),
                ...(input.orderby !== undefined && { $orderby: input.orderby }),
                ...(input.top !== undefined && { $top: input.top })
            },
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = ProviderListResponseSchema.parse(response.data);

        return {
            phone_calls: parsed.value.map((call) => ({
                ...Object.fromEntries(Object.entries(call).filter(([key]) => !KNOWN_PHONE_CALL_KEYS.has(key))),
                id: call.activityid,
                ...(call.subject != null && { subject: call.subject }),
                ...(call.description != null && { description: call.description }),
                ...(call.phonenumber != null && { phonenumber: call.phonenumber }),
                ...(call.directioncode != null && { directioncode: call.directioncode }),
                ...(call.scheduledstart != null && { scheduledstart: call.scheduledstart }),
                ...(call.scheduledend != null && { scheduledend: call.scheduledend }),
                ...(call.actualstart != null && { actualstart: call.actualstart }),
                ...(call.actualend != null && { actualend: call.actualend }),
                ...(call.scheduleddurationminutes != null && { scheduleddurationminutes: call.scheduleddurationminutes }),
                ...(call.actualdurationminutes != null && { actualdurationminutes: call.actualdurationminutes }),
                ...(call.prioritycode != null && { prioritycode: call.prioritycode }),
                ...(call.statecode != null && { statecode: call.statecode }),
                ...(call.statuscode != null && { statuscode: call.statuscode }),
                ...(call.leftvoicemail != null && { leftvoicemail: call.leftvoicemail }),
                ...(call.createdon != null && { createdon: call.createdon }),
                ...(call.modifiedon != null && { modifiedon: call.modifiedon }),
                ...(call._regardingobjectid_value != null && { _regardingobjectid_value: call._regardingobjectid_value }),
                ...(call._ownerid_value != null && { _ownerid_value: call._ownerid_value })
            })),
            ...(parsed['@odata.nextLink'] !== undefined && { next_link: parsed['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
