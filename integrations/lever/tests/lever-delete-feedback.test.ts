import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-feedback.js';

describe('lever-basic delete-feedback tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-feedback',
        Model: 'ActionOutput_lever_basic_deletefeedback'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
