import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-form-questions.js';

describe('jotform add-form-questions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-form-questions',
        Model: 'ActionOutput_jotform_addformquestions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
