export interface GongUser {
    id: string;
    emailAddress: string;
    created: string;
    active: boolean;
    emailAliases: string[];
    trustedEmailAddress: string;
    firstName: string;
    lastName: string;
    title: string;
    phoneNumber: string;
    extension: string;
    personalMeetingUrls: string[];
    settings: Record<string, boolean>;
    managerId: string;
    meetingConsentPageUrl: string;
    spokenLanguages: {
        language?: string;
        proficiency?: string;
    }[];
}
