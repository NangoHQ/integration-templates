import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-feedback-template.js';

describe('lever-basic update-feedback-template tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-feedback-template',
        Model: 'ActionOutput_lever_basic_updatefeedbacktemplate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
