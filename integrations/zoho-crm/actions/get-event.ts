import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique ID of the event to retrieve. Example: "4150868000002792020"')
});

const OwnerSchema = z.object({
    name: z.string().optional(),
    id: z.string(),
    email: z.string().optional()
});

const ParticipantSchema = z.object({
    Email: z.string().optional(),
    name: z.string().optional(),
    invited: z.boolean().optional(),
    id: z.string(),
    type: z.string().optional(),
    participant: z.string().optional(),
    status: z.string().optional()
});

const RecurringActivitySchema = z.object({
    RRULE: z.string().optional()
});

const WhatIdSchema = z.object({
    name: z.string().optional(),
    id: z.string()
});

const TagSchema = z.object({
    name: z.string().optional(),
    id: z.string().optional(),
    color: z.string().optional()
});

const ProviderEventSchema = z.object({
    id: z.string(),
    Event_Title: z.string().nullable().optional(),
    Start_DateTime: z.string().nullable().optional(),
    End_DateTime: z.string().nullable().optional(),
    All_day: z.boolean().nullable().optional(),
    Owner: OwnerSchema.nullable().optional(),
    Participants: z.array(ParticipantSchema).nullable().optional(),
    Venue: z.string().nullable().optional(),
    Description: z.string().nullable().optional(),
    Remind_At: z.string().nullable().optional(),
    Check_In_Status: z.string().nullable().optional(),
    Check_In_Time: z.string().nullable().optional(),
    Check_In_By: OwnerSchema.nullable().optional(),
    Check_In_City: z.string().nullable().optional(),
    Check_In_Country: z.string().nullable().optional(),
    Check_In_State: z.string().nullable().optional(),
    Check_In_Address: z.string().nullable().optional(),
    Check_In_Sub_Locality: z.string().nullable().optional(),
    Check_In_Comment: z.string().nullable().optional(),
    Latitude: z.number().nullable().optional(),
    Longitude: z.number().nullable().optional(),
    ZIP_Code: z.string().nullable().optional(),
    Recurring_Activity: RecurringActivitySchema.nullable().optional(),
    What_Id: WhatIdSchema.nullable().optional(),
    Who_Id: WhatIdSchema.nullable().optional(),
    $se_module: z.string().nullable().optional(),
    Tag: z.array(TagSchema).nullable().optional(),
    Created_Time: z.string().nullable().optional(),
    Modified_Time: z.string().nullable().optional(),
    Created_By: OwnerSchema.nullable().optional(),
    Modified_By: OwnerSchema.nullable().optional(),
    Currency: z.string().nullable().optional(),
    Exchange_Rate: z.number().nullable().optional(),
    $currency_symbol: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    startDateTime: z.string().optional(),
    endDateTime: z.string().optional(),
    allDay: z.boolean().optional(),
    owner: z
        .object({
            name: z.string().optional(),
            id: z.string(),
            email: z.string().optional()
        })
        .optional(),
    participants: z
        .array(
            z.object({
                email: z.string().optional(),
                name: z.string().optional(),
                invited: z.boolean().optional(),
                id: z.string(),
                type: z.string().optional(),
                participantId: z.string().optional(),
                status: z.string().optional()
            })
        )
        .optional(),
    venue: z.string().optional(),
    description: z.string().optional(),
    remindAt: z.string().optional(),
    checkInStatus: z.string().optional(),
    checkInTime: z.string().optional(),
    checkInBy: z
        .object({
            name: z.string().optional(),
            id: z.string(),
            email: z.string().optional()
        })
        .optional(),
    checkInCity: z.string().optional(),
    checkInCountry: z.string().optional(),
    checkInState: z.string().optional(),
    checkInAddress: z.string().optional(),
    checkInSubLocality: z.string().optional(),
    checkInComment: z.string().optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    zipCode: z.string().optional(),
    recurringActivity: z
        .object({
            rrule: z.string().optional()
        })
        .optional(),
    relatedTo: z
        .object({
            name: z.string().optional(),
            id: z.string(),
            module: z.string().optional()
        })
        .optional(),
    relatedContact: z
        .object({
            name: z.string().optional(),
            id: z.string()
        })
        .optional(),
    tags: z
        .array(
            z.object({
                name: z.string().optional(),
                id: z.string().optional(),
                color: z.string().optional()
            })
        )
        .optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional(),
    createdBy: z
        .object({
            name: z.string().optional(),
            id: z.string(),
            email: z.string().optional()
        })
        .optional(),
    modifiedBy: z
        .object({
            name: z.string().optional(),
            id: z.string(),
            email: z.string().optional()
        })
        .optional(),
    currency: z.string().optional(),
    exchangeRate: z.number().optional(),
    currencySymbol: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single event from Zoho CRM.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoCRM.modules.Events.READ', 'ZohoCRM.modules.READ', 'ZohoCRM.READ'], // Zoho CRM Events read scopes

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/crm/developer/docs/api/v2/get-record.html
        const response = await nango.get({
            endpoint: `/crm/v2/Events/${input.id}`,
            retries: 3
        });

        if (!response.data || !response.data.data || !Array.isArray(response.data.data) || response.data.data.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Event not found',
                id: input.id
            });
        }

        const providerEvent = ProviderEventSchema.parse(response.data.data[0]);

        return {
            id: providerEvent.id,
            ...(providerEvent.Event_Title !== undefined && providerEvent.Event_Title !== null && { title: providerEvent.Event_Title }),
            ...(providerEvent.Start_DateTime !== undefined && providerEvent.Start_DateTime !== null && { startDateTime: providerEvent.Start_DateTime }),
            ...(providerEvent.End_DateTime !== undefined && providerEvent.End_DateTime !== null && { endDateTime: providerEvent.End_DateTime }),
            ...(providerEvent.All_day !== undefined && providerEvent.All_day !== null && { allDay: providerEvent.All_day }),
            ...(providerEvent.Owner !== undefined &&
                providerEvent.Owner !== null && {
                    owner: {
                        id: providerEvent.Owner.id,
                        ...(providerEvent.Owner.name !== undefined && { name: providerEvent.Owner.name }),
                        ...(providerEvent.Owner.email !== undefined && { email: providerEvent.Owner.email })
                    }
                }),
            ...(providerEvent.Participants !== undefined &&
                providerEvent.Participants !== null && {
                    participants: providerEvent.Participants.map((p) => ({
                        id: p.id,
                        ...(p.Email !== undefined && { email: p.Email }),
                        ...(p.name !== undefined && { name: p.name }),
                        ...(p.invited !== undefined && { invited: p.invited }),
                        ...(p.type !== undefined && { type: p.type }),
                        ...(p.participant !== undefined && { participantId: p.participant }),
                        ...(p.status !== undefined && { status: p.status })
                    }))
                }),
            ...(providerEvent.Venue !== undefined && providerEvent.Venue !== null && { venue: providerEvent.Venue }),
            ...(providerEvent.Description !== undefined && providerEvent.Description !== null && { description: providerEvent.Description }),
            ...(providerEvent.Remind_At !== undefined && providerEvent.Remind_At !== null && { remindAt: providerEvent.Remind_At }),
            ...(providerEvent.Check_In_Status !== undefined && providerEvent.Check_In_Status !== null && { checkInStatus: providerEvent.Check_In_Status }),
            ...(providerEvent.Check_In_Time !== undefined && providerEvent.Check_In_Time !== null && { checkInTime: providerEvent.Check_In_Time }),
            ...(providerEvent.Check_In_By !== undefined &&
                providerEvent.Check_In_By !== null && {
                    checkInBy: {
                        id: providerEvent.Check_In_By.id,
                        ...(providerEvent.Check_In_By.name !== undefined && { name: providerEvent.Check_In_By.name }),
                        ...(providerEvent.Check_In_By.email !== undefined && { email: providerEvent.Check_In_By.email })
                    }
                }),
            ...(providerEvent.Check_In_City !== undefined && providerEvent.Check_In_City !== null && { checkInCity: providerEvent.Check_In_City }),
            ...(providerEvent.Check_In_Country !== undefined && providerEvent.Check_In_Country !== null && { checkInCountry: providerEvent.Check_In_Country }),
            ...(providerEvent.Check_In_State !== undefined && providerEvent.Check_In_State !== null && { checkInState: providerEvent.Check_In_State }),
            ...(providerEvent.Check_In_Address !== undefined && providerEvent.Check_In_Address !== null && { checkInAddress: providerEvent.Check_In_Address }),
            ...(providerEvent.Check_In_Sub_Locality !== undefined &&
                providerEvent.Check_In_Sub_Locality !== null && { checkInSubLocality: providerEvent.Check_In_Sub_Locality }),
            ...(providerEvent.Check_In_Comment !== undefined && providerEvent.Check_In_Comment !== null && { checkInComment: providerEvent.Check_In_Comment }),
            ...(providerEvent.Latitude !== undefined && providerEvent.Latitude !== null && { latitude: providerEvent.Latitude }),
            ...(providerEvent.Longitude !== undefined && providerEvent.Longitude !== null && { longitude: providerEvent.Longitude }),
            ...(providerEvent.ZIP_Code !== undefined && providerEvent.ZIP_Code !== null && { zipCode: providerEvent.ZIP_Code }),
            ...(providerEvent.Recurring_Activity !== undefined &&
                providerEvent.Recurring_Activity !== null && {
                    recurringActivity: {
                        ...(providerEvent.Recurring_Activity.RRULE !== undefined && { rrule: providerEvent.Recurring_Activity.RRULE })
                    }
                }),
            ...(providerEvent.What_Id !== undefined &&
                providerEvent.What_Id !== null && {
                    relatedTo: {
                        id: providerEvent.What_Id.id,
                        ...(providerEvent.What_Id.name !== undefined && { name: providerEvent.What_Id.name }),
                        ...(providerEvent.$se_module !== undefined && providerEvent.$se_module !== null && { module: providerEvent.$se_module })
                    }
                }),
            ...(providerEvent.Who_Id !== undefined &&
                providerEvent.Who_Id !== null && {
                    relatedContact: {
                        id: providerEvent.Who_Id.id,
                        ...(providerEvent.Who_Id.name !== undefined && { name: providerEvent.Who_Id.name })
                    }
                }),
            ...(providerEvent.Tag !== undefined &&
                providerEvent.Tag !== null && {
                    tags: providerEvent.Tag.map((t) => ({
                        ...(t.name !== undefined && { name: t.name }),
                        ...(t.id !== undefined && { id: t.id }),
                        ...(t.color !== undefined && { color: t.color })
                    }))
                }),
            ...(providerEvent.Created_Time !== undefined && providerEvent.Created_Time !== null && { createdTime: providerEvent.Created_Time }),
            ...(providerEvent.Modified_Time !== undefined && providerEvent.Modified_Time !== null && { modifiedTime: providerEvent.Modified_Time }),
            ...(providerEvent.Created_By !== undefined &&
                providerEvent.Created_By !== null && {
                    createdBy: {
                        id: providerEvent.Created_By.id,
                        ...(providerEvent.Created_By.name !== undefined && { name: providerEvent.Created_By.name }),
                        ...(providerEvent.Created_By.email !== undefined && { email: providerEvent.Created_By.email })
                    }
                }),
            ...(providerEvent.Modified_By !== undefined &&
                providerEvent.Modified_By !== null && {
                    modifiedBy: {
                        id: providerEvent.Modified_By.id,
                        ...(providerEvent.Modified_By.name !== undefined && { name: providerEvent.Modified_By.name }),
                        ...(providerEvent.Modified_By.email !== undefined && { email: providerEvent.Modified_By.email })
                    }
                }),
            ...(providerEvent.Currency !== undefined && providerEvent.Currency !== null && { currency: providerEvent.Currency }),
            ...(providerEvent.Exchange_Rate !== undefined && providerEvent.Exchange_Rate !== null && { exchangeRate: providerEvent.Exchange_Rate }),
            ...(providerEvent.$currency_symbol !== undefined && providerEvent.$currency_symbol !== null && { currencySymbol: providerEvent.$currency_symbol })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
