import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-profile-list-property.js';

describe('mixpanel remove-profile-list-property tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-profile-list-property',
        Model: 'ActionOutput_mixpanel_removeprofilelistproperty'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
