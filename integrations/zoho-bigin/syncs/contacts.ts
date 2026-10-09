import { createSync } from 'nango';
import { z } from 'zod';

const CONTACTS_ENDPOINT = '/bigin/v2/Contacts';
const CONTACTS_SEARCH_ENDPOINT = '/bigin/v2/Contacts/search';
const PAGE_SIZE = 200;

// Bigin always returns the record `id` and the module's system fields, but every
// other field must be requested explicitly through the required `fields` query
// parameter (max 50 fields). This list is the subset this sync maps.
const CONTACT_FIELDS = [
    'id',
    'First_Name',
    'Last_Name',
    'Full_Name',
    'Email',
    'Phone',
    'Mobile',
    'Home_Phone',
    'Title',
    'Description',
    'Account_Name',
    'Owner',
    'Created_By',
    'Modified_By',
    'Mailing_Street',
    'Mailing_City',
    'Mailing_State',
    'Mailing_Zip',
    'Mailing_Country',
    'Email_Opt_Out',
    'Last_Activity_Time',
    'Unsubscribed_Mode',
    'Unsubscribed_Time',
    'Record_Image',
    'Created_Time',
    'Modified_Time',
    'Tag'
].join(',');

// Bigin's search index is eventually consistent (~10-20s propagation delay), so a
// run that sets its next cursor to "now" can permanently skip records that were
// modified moments before the run but had not entered the index yet. Every run
// re-fetches this overlapping window instead.
const LOOKBACK_BUFFER_MS = 2 * 60 * 1000;

// A full unfiltered scan is the only reliable way to detect deletions on Bigin:
// there is no deleted-records endpoint within this connection's scopes and the
// changed-only /search endpoint simply omits deleted rows. The scan runs at most
// once per interval; incremental /search runs cover the time between scans.
const FULL_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const ContactUserSchema = z
    .object({
        name: z.string().optional().describe('Display name of the Bigin user. Example: Sarah Johnson.'),
        id: z.string().optional().describe('Identifier of the Bigin user. Example: 2034020000000474061.'),
        email: z.string().optional().describe('Email address of the Bigin user. Example: sarah.johnson@example.com.')
    })
    .describe('A reference to a Bigin user, used for the contact owner, creator and last modifier.');

const ContactAccountSchema = z
    .object({
        name: z.string().optional().describe('Display name of the linked company (a Bigin Accounts record). Example: Zylker Corp.'),
        id: z.string().optional().describe('Identifier of the linked company (a Bigin Accounts record). Example: 2034020000000478021.')
    })
    .describe(
        'The company (Bigin Accounts record) linked to the contact through the Account_Name lookup field. Absent when the contact has no linked company.'
    );

const ContactTagSchema = z
    .object({
        name: z.string().optional().describe('Tag label. Example: Technology.'),
        id: z.string().optional().describe('Identifier of the tag. Example: 2034020000000625001.'),
        color_code: z.string().optional().describe('Hex color code assigned to the tag. Example: #D4C9FD.')
    })
    .describe('A tag attached to the contact record.');

const ContactSchema = z
    .object({
        id: z.string().describe('Unique Bigin contact identifier. Example: 2034020000000489022.'),
        First_Name: z.string().optional().describe('First name of the contact. Example: Sophia.'),
        Last_Name: z.string().optional().describe('Last name of the contact. Example: Brooks.'),
        Full_Name: z.string().optional().describe('Full name of the contact as computed by Bigin. Example: Sophia Brooks.'),
        Email: z.string().optional().describe('Primary email address of the contact. Example: sophia.brooks@example.com.'),
        Phone: z.string().optional().describe('Work phone number of the contact.'),
        Mobile: z.string().optional().describe('Mobile phone number of the contact.'),
        Home_Phone: z.string().optional().describe('Home phone number of the contact.'),
        Title: z.string().optional().describe('Job title of the contact.'),
        Description: z.string().optional().describe('Free-text notes recorded about the contact.'),
        Account_Name: ContactAccountSchema.optional().describe('The company (Bigin Accounts record) linked to the contact, when set.'),
        Owner: ContactUserSchema.optional().describe('The Bigin user who owns the contact record.'),
        Created_By: ContactUserSchema.optional().describe('The Bigin user who created the contact record.'),
        Modified_By: ContactUserSchema.optional().describe('The Bigin user who last modified the contact record.'),
        Mailing_Street: z.string().optional().describe('Street of the contact mailing address.'),
        Mailing_City: z.string().optional().describe('City of the contact mailing address.'),
        Mailing_State: z.string().optional().describe('State or province of the contact mailing address.'),
        Mailing_Zip: z.string().optional().describe('ZIP or postal code of the contact mailing address.'),
        Mailing_Country: z.string().optional().describe('Country of the contact mailing address.'),
        Email_Opt_Out: z.boolean().optional().describe('Whether the contact has opted out of email communication.'),
        Last_Activity_Time: z.string().optional().describe('ISO-8601 timestamp of the last activity on the contact. Example: 2023-05-26T12:29:51+05:30.'),
        Unsubscribed_Mode: z.string().optional().describe('Mode by which the contact unsubscribed from emails, when applicable.'),
        Unsubscribed_Time: z.string().optional().describe('ISO-8601 timestamp when the contact unsubscribed, when applicable.'),
        Record_Image: z.string().optional().describe('URL or path of the contact profile image, when set.'),
        Created_Time: z.string().describe('ISO-8601 timestamp when the contact was created. Example: 2023-04-20T17:13:47+05:30.'),
        Modified_Time: z.string().describe('ISO-8601 timestamp when the contact was last modified. Example: 2023-05-26T12:29:51+05:30.'),
        Tag: z.array(ContactTagSchema).optional().describe('Tags attached to the contact record.')
    })
    .describe('A contact (person) from the Zoho Bigin Contacts module.');

// Raw provider shape. Bigin represents empty values as explicit JSON null (not
// omission), so nullable() is required alongside optional() or real null payloads
// fail validation.
const ProviderContactSchema = z.object({
    id: z.string(),
    First_Name: z.string().nullable().optional(),
    Last_Name: z.string().nullable().optional(),
    Full_Name: z.string().nullable().optional(),
    Email: z.string().nullable().optional(),
    Phone: z.string().nullable().optional(),
    Mobile: z.string().nullable().optional(),
    Home_Phone: z.string().nullable().optional(),
    Title: z.string().nullable().optional(),
    Description: z.string().nullable().optional(),
    Account_Name: z
        .object({
            name: z.string().nullable().optional(),
            id: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    Owner: z
        .object({
            name: z.string().nullable().optional(),
            id: z.string().nullable().optional(),
            email: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    Created_By: z
        .object({
            name: z.string().nullable().optional(),
            id: z.string().nullable().optional(),
            email: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    Modified_By: z
        .object({
            name: z.string().nullable().optional(),
            id: z.string().nullable().optional(),
            email: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    Mailing_Street: z.string().nullable().optional(),
    Mailing_City: z.string().nullable().optional(),
    Mailing_State: z.string().nullable().optional(),
    Mailing_Zip: z.string().nullable().optional(),
    Mailing_Country: z.string().nullable().optional(),
    Email_Opt_Out: z.boolean().nullable().optional(),
    Last_Activity_Time: z.string().nullable().optional(),
    Unsubscribed_Mode: z.string().nullable().optional(),
    Unsubscribed_Time: z.string().nullable().optional(),
    Record_Image: z.string().nullable().optional(),
    Created_Time: z.string(),
    Modified_Time: z.string(),
    Tag: z
        .array(
            z.object({
                name: z.string().nullable().optional(),
                id: z.string().nullable().optional(),
                color_code: z.string().nullable().optional()
            })
        )
        .nullable()
        .optional()
});

const ProviderInfoSchema = z.object({
    count: z.number().nullable().optional(),
    page: z.number().nullable().optional(),
    per_page: z.number().nullable().optional(),
    more_records: z.boolean().nullable().optional(),
    next_page_token: z.string().nullable().optional(),
    page_token_expiry: z.string().nullable().optional()
});

const ProviderContactsResponseSchema = z.object({
    data: z.array(ProviderContactSchema).nullable().optional(),
    info: ProviderInfoSchema.nullable().optional()
});

type ProviderContact = z.infer<typeof ProviderContactSchema>;
type Contact = z.infer<typeof ContactSchema>;

const CheckpointSchema = z.object({
    updated_after: z
        .string()
        .describe('ISO-8601 high-water mark, minus the safety buffer, used as the Modified_Time cursor for the next incremental /search pass.'),
    last_full_refresh: z.string().describe('ISO-8601 timestamp of the last completed full scan that reconciled deletions.'),
    full_refresh_started_at: z.string().describe('ISO-8601 timestamp when the current delete-tracked full scan first began.'),
    full_refresh_page: z.number().int().nonnegative().describe('Next page number to request if a full Contacts scan resumes without a page token.'),
    full_refresh_page_token: z.string().describe('Opaque next_page_token used to resume a full Contacts scan beyond the first 2000 records.'),
    full_refresh_page_token_expiry: z.string().describe('ISO-8601 timestamp when the saved full_refresh_page_token expires, when Bigin provides one.')
});

function parseContactsResponse(response: { status: number; data: unknown }): {
    contacts: Contact[];
    moreRecords: boolean;
    page: number | undefined;
    nextPageToken: string | undefined;
    pageTokenExpiry: string | undefined;
} {
    if (response.status === 204 || response.data === '' || response.data === null || response.data === undefined) {
        return { contacts: [], moreRecords: false, page: undefined, nextPageToken: undefined, pageTokenExpiry: undefined };
    }

    const parsed = ProviderContactsResponseSchema.parse(response.data);

    return {
        contacts: (parsed.data ?? []).map(mapProviderContact),
        moreRecords: parsed.info?.more_records ?? false,
        page: parsed.info?.page ?? undefined,
        nextPageToken: parsed.info?.next_page_token ?? undefined,
        pageTokenExpiry: parsed.info?.page_token_expiry ?? undefined
    };
}

function mapProviderContact(record: ProviderContact): Contact {
    return {
        id: record.id,
        First_Name: record.First_Name ?? undefined,
        Last_Name: record.Last_Name ?? undefined,
        Full_Name: record.Full_Name ?? undefined,
        Email: record.Email ?? undefined,
        Phone: record.Phone ?? undefined,
        Mobile: record.Mobile ?? undefined,
        Home_Phone: record.Home_Phone ?? undefined,
        Title: record.Title ?? undefined,
        Description: record.Description ?? undefined,
        Account_Name:
            record.Account_Name != null
                ? {
                      name: record.Account_Name.name ?? undefined,
                      id: record.Account_Name.id ?? undefined
                  }
                : undefined,
        Owner:
            record.Owner != null
                ? {
                      name: record.Owner.name ?? undefined,
                      id: record.Owner.id ?? undefined,
                      email: record.Owner.email ?? undefined
                  }
                : undefined,
        Created_By:
            record.Created_By != null
                ? {
                      name: record.Created_By.name ?? undefined,
                      id: record.Created_By.id ?? undefined,
                      email: record.Created_By.email ?? undefined
                  }
                : undefined,
        Modified_By:
            record.Modified_By != null
                ? {
                      name: record.Modified_By.name ?? undefined,
                      id: record.Modified_By.id ?? undefined,
                      email: record.Modified_By.email ?? undefined
                  }
                : undefined,
        Mailing_Street: record.Mailing_Street ?? undefined,
        Mailing_City: record.Mailing_City ?? undefined,
        Mailing_State: record.Mailing_State ?? undefined,
        Mailing_Zip: record.Mailing_Zip ?? undefined,
        Mailing_Country: record.Mailing_Country ?? undefined,
        Email_Opt_Out: record.Email_Opt_Out ?? undefined,
        Last_Activity_Time: record.Last_Activity_Time ?? undefined,
        Unsubscribed_Mode: record.Unsubscribed_Mode ?? undefined,
        Unsubscribed_Time: record.Unsubscribed_Time ?? undefined,
        Record_Image: record.Record_Image ?? undefined,
        Created_Time: record.Created_Time,
        Modified_Time: record.Modified_Time,
        Tag:
            record.Tag != null
                ? record.Tag.map((tag) => ({
                      name: tag.name ?? undefined,
                      id: tag.id ?? undefined,
                      color_code: tag.color_code ?? undefined
                  }))
                : undefined
    };
}

// Zoho criteria datetime values are emitted with a numeric UTC offset; the
// connection is UTC-based so every timestamp is rendered as +00:00.
function toZohoDateTime(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

function shouldUseSavedPageToken(pageToken: string | undefined, pageTokenExpiry: string | undefined, now: Date): boolean {
    if (!pageToken) {
        return false;
    }

    if (!pageTokenExpiry) {
        return true;
    }

    const expiryMs = Date.parse(pageTokenExpiry);
    return Number.isNaN(expiryMs) || expiryMs > now.getTime();
}

async function syncIncrementalContacts(nango: NangoSyncLocal, updatedAfter: string): Promise<void> {
    let page = 1;

    while (true) {
        // https://www.bigin.com/developer/docs/apis/v2/search-records.html
        const response = await nango.get<unknown>({
            endpoint: CONTACTS_SEARCH_ENDPOINT,
            params: {
                criteria: `(Modified_Time:greater_than:${updatedAfter})`,
                page,
                per_page: PAGE_SIZE
            },
            retries: 3
        });

        const { contacts, moreRecords } = parseContactsResponse(response);

        if (contacts.length > 0) {
            await nango.batchSave(contacts, 'Contact');
        }

        if (!moreRecords) {
            return;
        }

        page += 1;
    }
}

const sync = createSync({
    description: 'Sync all contacts (people) in the Bigin org, incrementally where possible.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Contact: ContactSchema
    },
    scopes: ['ZohoBigin.modules.contacts.ALL'],

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse({
            updated_after: '',
            last_full_refresh: '',
            full_refresh_started_at: '',
            full_refresh_page: 0,
            full_refresh_page_token: '',
            full_refresh_page_token_expiry: '',
            ...((await nango.getCheckpoint()) ?? {})
        });
        const updatedAfter = checkpoint.updated_after !== '' ? checkpoint.updated_after : undefined;
        const lastFullRefreshValue = checkpoint.last_full_refresh !== '' ? checkpoint.last_full_refresh : undefined;
        const fullRefreshStartedAtCheckpoint = checkpoint.full_refresh_started_at !== '' ? checkpoint.full_refresh_started_at : undefined;
        const fullRefreshPage = checkpoint.full_refresh_page > 0 ? checkpoint.full_refresh_page : undefined;
        const fullRefreshPageToken = checkpoint.full_refresh_page_token !== '' ? checkpoint.full_refresh_page_token : undefined;
        const fullRefreshPageTokenExpiry = checkpoint.full_refresh_page_token_expiry !== '' ? checkpoint.full_refresh_page_token_expiry : undefined;
        const runStartedAt = new Date();
        const lastFullRefresh = lastFullRefreshValue !== undefined ? Date.parse(lastFullRefreshValue) : Number.NaN;

        // A full unfiltered scan is required periodically to reconcile deletions and to
        // seed the incremental cursor. trackDeletesStart/trackDeletesEnd must never be
        // combined with the changed-only /search endpoint (which omits unchanged rows
        // and would cause false deletions), so the delete window only wraps the plain
        // list pass below.
        const fullRefreshDue =
            fullRefreshStartedAtCheckpoint !== undefined ||
            updatedAfter === undefined ||
            !Number.isFinite(lastFullRefresh) ||
            runStartedAt.getTime() - lastFullRefresh >= FULL_REFRESH_INTERVAL_MS;

        if (fullRefreshDue) {
            await nango.trackDeletesStart('Contact');

            let fullRefreshStartedAt = fullRefreshStartedAtCheckpoint ?? runStartedAt.toISOString();
            const usingSavedPageToken = shouldUseSavedPageToken(fullRefreshPageToken, fullRefreshPageTokenExpiry, runStartedAt);
            let page = fullRefreshPage ?? 1;
            let pageToken = usingSavedPageToken ? fullRefreshPageToken : undefined;

            if (fullRefreshPageToken !== undefined && !usingSavedPageToken) {
                // Restart from the first page when the opaque token has expired.
                fullRefreshStartedAt = runStartedAt.toISOString();
                page = 1;
            }

            while (true) {
                // https://www.bigin.com/developer/docs/apis/v2/get-records.html
                const response = await nango.get<unknown>({
                    endpoint: CONTACTS_ENDPOINT,
                    params: {
                        fields: CONTACT_FIELDS,
                        approved: 'both',
                        per_page: PAGE_SIZE,
                        ...(pageToken ? { page_token: pageToken } : { page })
                    },
                    retries: 3
                });

                const { contacts, moreRecords, page: responsePage, nextPageToken, pageTokenExpiry } = parseContactsResponse(response);

                if (contacts.length > 0) {
                    await nango.batchSave(contacts, 'Contact');
                }

                if (!moreRecords) {
                    break;
                }

                page = (responsePage ?? page) + 1;
                pageToken = nextPageToken ?? undefined;

                await nango.saveCheckpoint({
                    updated_after: updatedAfter ?? '',
                    last_full_refresh: lastFullRefreshValue ?? '',
                    full_refresh_started_at: fullRefreshStartedAt,
                    full_refresh_page: page,
                    full_refresh_page_token: pageToken ?? '',
                    full_refresh_page_token_expiry: pageTokenExpiry ?? ''
                });
            }

            await nango.clearCheckpoint();
            await nango.trackDeletesEnd('Contact');

            await nango.saveCheckpoint({
                updated_after: toZohoDateTime(new Date(Date.parse(fullRefreshStartedAt) - LOOKBACK_BUFFER_MS)),
                last_full_refresh: new Date().toISOString(),
                full_refresh_started_at: '',
                full_refresh_page: 0,
                full_refresh_page_token: '',
                full_refresh_page_token_expiry: ''
            });
            return;
        }

        if (updatedAfter === undefined) {
            throw new Error('Contacts incremental sync requires an existing updated_after checkpoint.');
        }

        // Incremental pass via the eventually-consistent search endpoint. Only
        // contacts modified after the buffered cursor are returned; deletion
        // detection is handled by the periodic full scan above.
        await syncIncrementalContacts(nango, updatedAfter);

        await nango.saveCheckpoint({
            updated_after: toZohoDateTime(new Date(runStartedAt.getTime() - LOOKBACK_BUFFER_MS)),
            last_full_refresh: lastFullRefreshValue ?? runStartedAt.toISOString(),
            full_refresh_started_at: '',
            full_refresh_page: 0,
            full_refresh_page_token: '',
            full_refresh_page_token_expiry: ''
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
