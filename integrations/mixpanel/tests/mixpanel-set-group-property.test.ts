import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/set-group-property.js';

describe('mixpanel set-group-property tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'set-group-property',
        Model: 'ActionOutput_mixpanel_setgroupproperty'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
