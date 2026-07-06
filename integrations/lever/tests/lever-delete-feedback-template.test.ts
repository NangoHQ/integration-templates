import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-feedback-template.js';

describe('lever-basic delete-feedback-template tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-feedback-template',
        Model: 'ActionOutput_lever_basic_deletefeedbacktemplate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
