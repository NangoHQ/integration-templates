import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().describe('Contact ID. Example: 1')
});

const ContactLinksSchema = z.record(z.string(), z.string());

const ContactSchema = z.object({
    cdate: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    orgid: z.string().optional(),
    orgname: z.string().optional(),
    segmentio_id: z.string().optional(),
    bounced_hard: z.string().optional(),
    bounced_soft: z.string().optional(),
    bounced_date: z.string().nullable().optional(),
    ip: z.string().optional(),
    ua: z.string().nullable().optional(),
    hash: z.string().optional(),
    socialdata_lastcheck: z.string().nullable().optional(),
    email_local: z.string().optional(),
    email_domain: z.string().optional(),
    sentcnt: z.string().optional(),
    rating_tstamp: z.string().nullable().optional(),
    gravatar: z.string().optional(),
    deleted: z.string().optional(),
    anonymized: z.string().optional(),
    adate: z.string().nullable().optional(),
    udate: z.string().nullable().optional(),
    edate: z.string().nullable().optional(),
    deleted_at: z.string().nullable().optional(),
    created_utc_timestamp: z.string().optional(),
    updated_utc_timestamp: z.string().optional(),
    created_timestamp: z.string().optional(),
    updated_timestamp: z.string().optional(),
    created_by: z.string().optional(),
    updated_by: z.string().optional(),
    email_empty: z.boolean().optional(),
    mpp_tracking: z.string().optional(),
    contactAutomations: z.array(z.string()).optional(),
    contactLists: z.array(z.string()).optional(),
    fieldValues: z.array(z.string()).optional(),
    geoIps: z.array(z.string()).optional(),
    deals: z.array(z.string()).optional(),
    accountContacts: z.array(z.string()).optional(),
    links: ContactLinksSchema.optional(),
    id: z.string(),
    organization: z.unknown().nullable().optional()
});

const ContactAutomationSchema = z.object({
    contact: z.string().optional(),
    seriesid: z.string().optional(),
    startid: z.string().optional(),
    status: z.string().optional(),
    adddate: z.string().optional(),
    remdate: z.string().nullable().optional(),
    timespan: z.unknown().nullable().optional(),
    lastblock: z.string().optional(),
    lastdate: z.string().optional(),
    completedElements: z.string().optional(),
    totalElements: z.string().optional(),
    completed: z.number().optional(),
    completeValue: z.number().optional(),
    links: z.record(z.string(), z.string()).optional(),
    id: z.string().optional(),
    automation: z.string().nullable().optional()
});

const ContactListSchema = z.object({
    contact: z.string().optional(),
    list: z.string().optional(),
    form: z.unknown().nullable().optional(),
    seriesid: z.string().optional(),
    sdate: z.string().nullable().optional(),
    udate: z.string().nullable().optional(),
    status: z.string().optional(),
    responder: z.string().optional(),
    sync: z.string().optional(),
    unsubreason: z.unknown().nullable().optional(),
    campaign: z.unknown().nullable().optional(),
    message: z.unknown().nullable().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    ip4Sub: z.string().optional(),
    sourceid: z.string().optional(),
    autosyncLog: z.unknown().nullable().optional(),
    ip4_last: z.string().optional(),
    ip4Unsub: z.string().optional(),
    unsubscribeAutomation: z.unknown().nullable().optional(),
    links: z.record(z.string(), z.string()).optional(),
    id: z.string().optional(),
    automation: z.unknown().nullable().optional()
});

const DealSchema = z.object({
    owner: z.string().optional(),
    contact: z.string().optional(),
    organization: z.unknown().nullable().optional(),
    group: z.unknown().nullable().optional(),
    title: z.string().optional(),
    nexttaskid: z.string().nullable().optional(),
    currency: z.string().optional(),
    status: z.string().optional(),
    links: z.record(z.string(), z.string()).optional(),
    id: z.string().optional(),
    nextTask: z.unknown().nullable().optional()
});

const FieldValueSchema = z.object({
    contact: z.string().optional(),
    field: z.string().optional(),
    value: z.unknown().nullable().optional(),
    cdate: z.string().optional(),
    udate: z.string().optional(),
    links: z.record(z.string(), z.string()).optional(),
    id: z.string().optional(),
    owner: z.string().optional()
});

const GeoAddressSchema = z.object({
    ip4: z.string().optional(),
    country2: z.string().optional(),
    country: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    zip: z.string().optional(),
    area: z.string().optional(),
    lat: z.string().optional(),
    lon: z.string().optional(),
    tz: z.string().optional(),
    tstamp: z.string().optional(),
    links: z.union([z.record(z.string(), z.string()), z.array(z.unknown())]).optional(),
    id: z.string().optional()
});

const GeoIpSchema = z.object({
    contact: z.string().optional(),
    campaignid: z.string().optional(),
    messageid: z.string().optional(),
    geoaddrid: z.string().optional(),
    ip4: z.string().optional(),
    tstamp: z.string().optional(),
    geoAddress: z.string().optional(),
    links: z.record(z.string(), z.string()).optional(),
    id: z.string().optional()
});

const OutputSchema = z.object({
    contactAutomations: z.array(ContactAutomationSchema).optional(),
    contactLists: z.array(ContactListSchema).optional(),
    deals: z.array(DealSchema).optional(),
    fieldValues: z.array(FieldValueSchema).optional(),
    geoAddresses: z.array(GeoAddressSchema).optional(),
    geoIps: z.array(GeoIpSchema).optional(),
    contact: ContactSchema
});

const action = createAction({
    description: 'Retrieve a single contact from ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-contact',
        group: 'Contacts'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.activecampaign.com/reference/retrieve-a-contact
            endpoint: `/3/contacts/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || !('contact' in response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact not found',
                id: input.id
            });
        }

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
