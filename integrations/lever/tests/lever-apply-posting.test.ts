import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/apply-posting.js';

describe('lever-basic apply-posting tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'apply-posting',
        Model: 'ActionOutput_lever_basic_applyposting'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
