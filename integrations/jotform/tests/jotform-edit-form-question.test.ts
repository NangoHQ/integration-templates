import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/edit-form-question.js';

describe('jotform edit-form-question tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'edit-form-question',
        Model: 'ActionOutput_jotform_editformquestion'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
