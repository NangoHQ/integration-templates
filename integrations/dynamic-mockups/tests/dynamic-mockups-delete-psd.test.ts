import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-psd.js';

describe('dynamic-mockups delete-psd tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-psd',
        Model: 'ActionOutput_dynamic_mockups_deletepsd'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
