import type { OktaUserGroupProfile, OktaActiveDirectoryGroupProfile, OktaGroup, CreateOktaGroup } from '../types.js';
import type { Group, OktaAddGroup } from '../../models.js';

export function toGroup(group: OktaGroup): Group {
    let profile: OktaUserGroupProfile | OktaActiveDirectoryGroupProfile | null = null;

    if (group.type === 'OKTA_GROUP' || group.type === 'BUILT_IN' || group.type === 'APP_GROUP') {
        if ('dn' in group.profile) {
            profile = {
                description: group.profile.description,
                dn: group.profile.dn,
                externalId: group.profile.externalId,
                name: group.profile.name,
                samAccountName: group.profile.samAccountName,
                windowsDomainQualifiedName: group.profile.windowsDomainQualifiedName
            };
        } else {
            profile = {
                description: group.profile.description || null,
                name: group.profile.name
            };
        }
    }

    return {
        id: group.id,
        created: group.created,
        lastMembershipUpdated: group.lastMembershipUpdated,
        lastUpdated: group.lastUpdated,
        objectClass: group.objectClass,
        type: group.type,
        profile: profile!
    };
}

export function createGroup(group: OktaAddGroup): Partial<CreateOktaGroup> {
    const oktaGroup: Partial<CreateOktaGroup> = {
        profile: {}
    };

    if (group.name) {
        oktaGroup.profile!.name = group.name;
    }

    if (group.description) {
        oktaGroup.profile!.description = group.description;
    }

    return oktaGroup;
}
