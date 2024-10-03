export interface HubspotUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roleIds: string[];
    primaryTeamId?: string;
    superAdmin: boolean;
}
