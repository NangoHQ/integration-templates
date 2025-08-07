import type { OktaUser, CreateOktaUser } from '../types.js';
import type { User, OktaCreateUser } from '../../models.js';

export function toUser(user: OktaUser): User {
    return {
        id: user.id,
        status: user.status,
        created: user.created,
        activated: user.activated,
        statusChanged: user.statusChanged,
        lastLogin: user.lastLogin || null,
        lastUpdated: user.lastUpdated,
        passwordChanged: user.passwordChanged || null,
        type: {
            id: user.type.id
        },
        profile: {
            firstName: user.profile.firstName || null,
            lastName: user.profile.lastName || null,
            mobilePhone: user.profile.mobilePhone || null,
            secondEmail: user.profile.secondEmail || null,
            login: user.profile.login,
            email: user.profile.email
        }
    };
}

export function createUser(user: OktaCreateUser): Partial<CreateOktaUser> {
    const oktaUser: Partial<CreateOktaUser> = {
        profile: {}
    };

    if (user.email) {
        oktaUser.profile!.email = user.email;
    }
    if (user.firstName) {
        oktaUser.profile!.firstName = user.firstName;
    }
    if (user.lastName) {
        oktaUser.profile!.lastName = user.lastName;
    }
    if (user.login) {
        oktaUser.profile!.login = user.login;
    }
    if (user.mobilePhone) {
        oktaUser.profile!.mobilePhone = user.mobilePhone;
    }
    return oktaUser;
}
