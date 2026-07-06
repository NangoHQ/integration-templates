import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/query-profile-activity.js';

describe('mixpanel query-profile-activity tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'query-profile-activity',
        Model: 'ActionOutput_mixpanel_queryprofileactivity'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
