import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/set-profile-property-once.js';

describe('mixpanel set-profile-property-once tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'set-profile-property-once',
        Model: 'ActionOutput_mixpanel_setprofilepropertyonce'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
