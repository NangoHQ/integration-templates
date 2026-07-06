import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-profile-property.js';

describe('mixpanel update-profile-property tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-profile-property',
        Model: 'ActionOutput_mixpanel_updateprofileproperty'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
