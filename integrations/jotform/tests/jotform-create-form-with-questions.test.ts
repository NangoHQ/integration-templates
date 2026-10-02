import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-form-with-questions.js';

describe('jotform create-form-with-questions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-form-with-questions',
        Model: 'ActionOutput_jotform_createformwithquestions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
