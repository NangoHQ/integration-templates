import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input required');

const ProviderLocationOptionSchema = z.object({
    label: z.string(),
    value: z.string(),
    icon: z.string().optional(),
    disabled: z.boolean().optional()
});

const ProviderIntegrationSchema = z.object({
    appData: z.unknown().nullable().optional(),
    dirName: z.string(),
    __template: z.string(),
    name: z.string(),
    description: z.string(),
    installed: z.boolean(),
    type: z.string(),
    title: z.string(),
    variant: z.string(),
    category: z.string(),
    categories: z.array(z.string()),
    logo: z.string(),
    publisher: z.string(),
    slug: z.string(),
    url: z.string(),
    email: z.string(),
    locationOption: ProviderLocationOptionSchema.nullable().optional()
});

const ProviderPrimarySchema = z.object({
    externalId: z.string(),
    integration: z.string(),
    name: z.string(),
    primary: z.boolean().nullable().optional(),
    readOnly: z.boolean(),
    email: z.string(),
    isSelected: z.boolean(),
    credentialId: z.number(),
    delegationCredentialId: z.string().nullable().optional()
});

const ProviderCalendarSchema = z.object({
    externalId: z.string(),
    integration: z.string(),
    name: z.string(),
    primary: z.boolean().nullable().optional(),
    readOnly: z.boolean(),
    email: z.string(),
    isSelected: z.boolean(),
    credentialId: z.number(),
    delegationCredentialId: z.string().nullable().optional()
});

const ProviderConnectedCalendarSchema = z.object({
    integration: ProviderIntegrationSchema,
    credentialId: z.number(),
    delegationCredentialId: z.string().nullable().optional(),
    primary: ProviderPrimarySchema,
    calendars: z.array(ProviderCalendarSchema)
});

const ProviderDestinationCalendarSchema = z.object({
    id: z.number(),
    integration: z.string(),
    externalId: z.string(),
    primaryEmail: z.string().nullable().optional(),
    userId: z.number().nullable().optional(),
    eventTypeId: z.number().nullable().optional(),
    credentialId: z.number().nullable().optional(),
    delegationCredentialId: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    primary: z.boolean(),
    readOnly: z.boolean(),
    email: z.string(),
    integrationTitle: z.string()
});

const ProviderResponseSchema = z.object({
    status: z.enum(['success', 'error']),
    data: z.object({
        connectedCalendars: z.array(ProviderConnectedCalendarSchema),
        destinationCalendar: ProviderDestinationCalendarSchema
    })
});

const IntegrationOutputSchema = z
    .object({
        appData: z.unknown().optional().describe('Integration app metadata'),
        dirName: z.string().describe('Directory name of the integration'),
        __template: z.string().describe('Template identifier'),
        name: z.string().describe('Integration name'),
        description: z.string().describe('Integration description'),
        installed: z.boolean().describe('Whether the integration is installed'),
        type: z.string().describe('Integration type'),
        title: z.string().describe('Integration display title'),
        variant: z.string().describe('Integration variant'),
        category: z.string().describe('Integration category'),
        categories: z.array(z.string()).describe('Integration categories'),
        logo: z.string().describe('Integration logo URL'),
        publisher: z.string().describe('Integration publisher'),
        slug: z.string().describe('Integration slug'),
        url: z.string().describe('Integration URL'),
        email: z.string().describe('Integration contact email'),
        locationOption: z
            .object({
                label: z.string().describe('Display label for this location option'),
                value: z.string().describe('Location type identifier'),
                icon: z.string().optional().describe('Icon identifier for this location option'),
                disabled: z.boolean().optional().describe('Whether this location option is disabled')
            })
            .optional()
            .describe('Location option for this integration')
    })
    .describe('Connected calendar integration details');

const PrimaryOutputSchema = z
    .object({
        externalId: z.string().describe('Primary calendar external ID'),
        integration: z.string().describe('Primary calendar integration type'),
        name: z.string().describe('Primary calendar name'),
        primary: z.boolean().optional().describe('Whether this is the primary calendar'),
        readOnly: z.boolean().describe('Whether the primary calendar is read-only'),
        email: z.string().describe('Primary calendar email address'),
        isSelected: z.boolean().describe('Whether the primary calendar is selected'),
        credentialId: z.number().describe('Primary calendar credential ID'),
        delegationCredentialId: z.string().optional().describe('Delegation credential ID for the primary calendar')
    })
    .describe('Primary calendar details');

const CalendarOutputSchema = z
    .object({
        externalId: z.string().describe('Calendar external ID'),
        integration: z.string().describe('Calendar integration type'),
        name: z.string().describe('Calendar name'),
        primary: z.boolean().optional().describe('Whether this is the primary calendar'),
        readOnly: z.boolean().describe('Whether the calendar is read-only'),
        email: z.string().describe('Calendar email address'),
        isSelected: z.boolean().describe('Whether the calendar is selected'),
        credentialId: z.number().describe('Calendar credential ID'),
        delegationCredentialId: z.string().optional().describe('Delegation credential ID for the calendar')
    })
    .describe('Calendar details');

const ConnectedCalendarOutputSchema = z
    .object({
        integration: IntegrationOutputSchema,
        credentialId: z.number().describe('Credential ID for the connected calendar integration'),
        delegationCredentialId: z.string().optional().describe('Delegation credential ID for the connected calendar'),
        primary: PrimaryOutputSchema,
        calendars: z.array(CalendarOutputSchema).describe('List of calendars for this integration')
    })
    .describe('Connected calendar integration with its calendars');

const DestinationCalendarOutputSchema = z
    .object({
        id: z.number().describe('Destination calendar ID'),
        integration: z.string().describe('Destination calendar integration type'),
        externalId: z.string().describe('Destination calendar external ID'),
        primaryEmail: z.string().optional().describe('Primary email for the destination calendar'),
        userId: z.number().optional().describe('User ID associated with the destination calendar'),
        eventTypeId: z.number().optional().describe('Event type ID associated with the destination calendar'),
        credentialId: z.number().optional().describe('Credential ID for the destination calendar'),
        delegationCredentialId: z.string().optional().describe('Delegation credential ID for the destination calendar'),
        name: z.string().optional().describe('Destination calendar name'),
        primary: z.boolean().describe('Whether this is the primary destination calendar'),
        readOnly: z.boolean().describe('Whether the destination calendar is read-only'),
        email: z.string().describe('Destination calendar email address'),
        integrationTitle: z.string().describe('Destination calendar integration title')
    })
    .describe('Destination calendar where bookings are written');

const OutputSchema = z
    .object({
        connectedCalendars: z.array(ConnectedCalendarOutputSchema).describe('List of connected calendar integrations'),
        destinationCalendar: DestinationCalendarOutputSchema.optional().describe('Calendar where new bookings are written')
    })
    .describe('List of connected calendars and destination calendar');

/**
 * @tags: [read]
 * @tagReason: Retrieves connected calendars from the Cal.com API without making any changes.
 * @pitfalls: Calendars are grouped by integration in `connectedCalendars` and the destination calendar is returned separately in `destinationCalendar`, so the same calendar may appear twice.
 */
const action = createAction({
    description: 'List calendars from Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['APPS_READ'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch: The Nango SDK throws for non-2xx responses. Convert Cal.com's error
        // envelope into a structured ActionError instead of letting the raw error propagate.
        try {
            response = await nango.get({
                // https://cal.com/docs/api-reference/v2/calendars/get-all-calendars
                endpoint: '/calendars',
                retries: 3
            });
        } catch (err: unknown) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com API returned an error status when listing calendars.',
                details: err instanceof Error ? err.message : String(err)
            });
        }

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No calendar data returned'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.status === 'error') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com returned an error status'
            });
        }

        return {
            connectedCalendars: providerResponse.data.connectedCalendars.map((cc) => ({
                integration: {
                    ...(cc.integration.appData != null && { appData: cc.integration.appData }),
                    dirName: cc.integration.dirName,
                    __template: cc.integration.__template,
                    name: cc.integration.name,
                    description: cc.integration.description,
                    installed: cc.integration.installed,
                    type: cc.integration.type,
                    title: cc.integration.title,
                    variant: cc.integration.variant,
                    category: cc.integration.category,
                    categories: cc.integration.categories,
                    logo: cc.integration.logo,
                    publisher: cc.integration.publisher,
                    slug: cc.integration.slug,
                    url: cc.integration.url,
                    email: cc.integration.email,
                    ...(cc.integration.locationOption != null && {
                        locationOption: {
                            label: cc.integration.locationOption.label,
                            value: cc.integration.locationOption.value,
                            ...(cc.integration.locationOption.icon != null && { icon: cc.integration.locationOption.icon }),
                            ...(cc.integration.locationOption.disabled != null && { disabled: cc.integration.locationOption.disabled })
                        }
                    })
                },
                credentialId: cc.credentialId,
                ...(cc.delegationCredentialId != null && { delegationCredentialId: cc.delegationCredentialId }),
                primary: {
                    externalId: cc.primary.externalId,
                    integration: cc.primary.integration,
                    name: cc.primary.name,
                    ...(cc.primary.primary != null && { primary: cc.primary.primary }),
                    readOnly: cc.primary.readOnly,
                    email: cc.primary.email,
                    isSelected: cc.primary.isSelected,
                    credentialId: cc.primary.credentialId,
                    ...(cc.primary.delegationCredentialId != null && { delegationCredentialId: cc.primary.delegationCredentialId })
                },
                calendars: cc.calendars.map((cal) => ({
                    externalId: cal.externalId,
                    integration: cal.integration,
                    name: cal.name,
                    ...(cal.primary != null && { primary: cal.primary }),
                    readOnly: cal.readOnly,
                    email: cal.email,
                    isSelected: cal.isSelected,
                    credentialId: cal.credentialId,
                    ...(cal.delegationCredentialId != null && { delegationCredentialId: cal.delegationCredentialId })
                }))
            })),
            destinationCalendar: {
                id: providerResponse.data.destinationCalendar.id,
                integration: providerResponse.data.destinationCalendar.integration,
                externalId: providerResponse.data.destinationCalendar.externalId,
                ...(providerResponse.data.destinationCalendar.primaryEmail != null && { primaryEmail: providerResponse.data.destinationCalendar.primaryEmail }),
                ...(providerResponse.data.destinationCalendar.userId != null && { userId: providerResponse.data.destinationCalendar.userId }),
                ...(providerResponse.data.destinationCalendar.eventTypeId != null && { eventTypeId: providerResponse.data.destinationCalendar.eventTypeId }),
                ...(providerResponse.data.destinationCalendar.credentialId != null && { credentialId: providerResponse.data.destinationCalendar.credentialId }),
                ...(providerResponse.data.destinationCalendar.delegationCredentialId != null && {
                    delegationCredentialId: providerResponse.data.destinationCalendar.delegationCredentialId
                }),
                ...(providerResponse.data.destinationCalendar.name != null && { name: providerResponse.data.destinationCalendar.name }),
                primary: providerResponse.data.destinationCalendar.primary,
                readOnly: providerResponse.data.destinationCalendar.readOnly,
                email: providerResponse.data.destinationCalendar.email,
                integrationTitle: providerResponse.data.destinationCalendar.integrationTitle
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
