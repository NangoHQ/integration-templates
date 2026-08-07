import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-motion-mockup-status.js';

describe('dynamic-mockups get-motion-mockup-status tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-motion-mockup-status',
        Model: 'ActionOutput_dynamic_mockups_getmotionmockupstatus'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
