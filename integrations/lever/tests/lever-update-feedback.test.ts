import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-feedback.js';

describe('lever-basic update-feedback tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-feedback',
        Model: 'ActionOutput_lever_basic_updatefeedback'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
