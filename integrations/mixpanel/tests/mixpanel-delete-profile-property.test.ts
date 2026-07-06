import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-profile-property.js';

describe('mixpanel delete-profile-property tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-profile-property',
        Model: 'ActionOutput_mixpanel_deleteprofileproperty'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
