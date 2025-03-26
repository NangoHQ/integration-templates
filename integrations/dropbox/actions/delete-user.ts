import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    if (!input || !input.id) {
        throw new nango.ActionError({
            message: 'Id is required'
        });
    }

    const config: ProxyConfiguration = {
        // https://www.dropbox.com/developers/documentation/http/teams#team-members-remove
        endpoint: `/2/team/members/remove`,
        data: {
            user: {
                '.tag': 'team_member_id',
                team_member_id: input.id
            }
        },
        retries: 3
    };

    await nango.post(config);

    return {
        success: true
    };
}
