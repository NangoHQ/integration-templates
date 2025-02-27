import type { NangoSync, OutlookCalendar, ProxyConfiguration } from '../../models';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const config: ProxyConfiguration = {
        // https://learn.microsoft.com/en-us/graph/api/user-list-calendars?view=graph-rest-1.0&tabs=http
        endpoint: '/v1.0/me/calendars',
        params: {
            $top: '100'
            // $select:
            //     'id,name,color,hexColor,changeKey,canShare,canViewPrivateItems,canEdit,allowedOnlineMeetingProviders,defaultOnlineMeetingProvider,isTallyingResponses,isRemovable,owner'
        },
        paginate: {
            type: 'link',
            response_path: 'value',
            link_path_in_response_body: '@odata.nextLink',
            limit: 100
        },
        retries: 10
    };

    for await (const calendarsPage of nango.paginate<OutlookCalendar>(config)) {
        const processedCalendars = calendarsPage.map((calendar: any) => {
            // Remove OData metadata properties
            delete calendar['@odata.etag'];
            delete calendar['@odata.id'];

            return calendar;
        });

        if (processedCalendars.length > 0) {
            await nango.batchSave<OutlookCalendar>(processedCalendars, 'OutlookCalendar');
        }
    }
}
