import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-feedback-templates.js';

describe('lever-basic get-feedback-templates tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-feedback-templates',
        Model: 'ActionOutput_lever_basic_getfeedbacktemplates'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
