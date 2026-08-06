import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-mockup.js';

describe('dynamic-mockups get-mockup tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-mockup',
        Model: 'ActionOutput_dynamic_mockups_getmockup'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
