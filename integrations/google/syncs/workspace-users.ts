import type { NangoSync, User, Metadata, OrgToSync } from '../../models.js';
import type { DirectoryUsersResponse } from '../types.js';

export default async function fetchData(nango: NangoSync) {
    const metadata = await nango.getMetadata<Metadata>();
    const { orgsToSync } = metadata;

    if (!metadata) {
        throw new Error('No metadata');
    }

    if (!orgsToSync || !orgsToSync.length) {
        throw new Error('No orgs to sync');
    }

    for (const orgUnit of orgsToSync) {
        await nango.log(`Fetching users for org unit ID: ${orgUnit.id} at the path: ${orgUnit.path}`);
        await fetchAndUpdateUsers(nango, orgUnit);
    }

    await nango.log('Detecting deleted users');
    await fetchAndUpdateUsers(nango, null, true);
}

async function fetchAndUpdateUsers(nango: NangoSync, orgUnit: OrgToSync | null, runDelete = false): Promise<void> {
    const baseUrlOverride = 'https://admin.googleapis.com';
    const endpoint = '/admin/directory/v1/users';

    let pageToken: string = '';
    do {
        const suspendedUsers: User[] = [];

        const params = {
            customer: 'my_customer',
            orderBy: 'email',
            query: orgUnit ? `orgUnitPath='${orgUnit.path}'` : '',
            maxResults: '500',
            showDeleted: runDelete ? 'true' : 'false',
            pageToken
        };

        const response = await nango.get<DirectoryUsersResponse & { nextPageToken?: string }>({
            baseUrlOverride,
            endpoint,
            params,
            retries: 10
        });

        if (!response) {
            await nango.log(`No response from the Google API${orgUnit ? `for organizational unit ID: ${orgUnit.id}` : '.'}`);
            break;
        }

        const { data } = response;

        if (!data.users) {
            await nango.log(`No users to ${runDelete ? 'delete.' : `save for organizational unit ID: ${orgUnit?.id}`}`);
            break;
        }

        const users: User[] = [];

        for (const u of data.users) {
            const user: User = {
                id: u.id,
                email: u.primaryEmail,
                displayName: u.name.fullName,
                familyName: u.name.familyName,
                givenName: u.name.givenName,
                picture: u.thumbnailPhotoUrl,
                type: u.kind,
                isAdmin: u.isAdmin,
                createdAt: u.creationTime,
                deletedAt: u.deletionTime || null,
                phone: {
                    value: u.phones?.[0]?.value,
                    type: u.phones?.[0]?.type
                },
                organizationId: runDelete ? null : orgUnit?.id,
                organizationPath: runDelete ? null : u.orgUnitPath,
                department: null
            };

            if (u.suspended || u.archived) {
                suspendedUsers.push(user);
                continue;
            }
            users.push(user);
        }

        if (runDelete) {
            await nango.batchDelete<User>(users, 'User');
        } else {
            await nango.batchSave<User>(users, 'User');

            if (suspendedUsers.length) {
                await nango.batchDelete<User>(suspendedUsers, 'User');
            }
        }
        if (data.nextPageToken) {
            pageToken = data.nextPageToken;
        }
    } while (pageToken);
}
