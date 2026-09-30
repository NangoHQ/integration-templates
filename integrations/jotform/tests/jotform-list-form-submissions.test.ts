import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-form-submissions.js';

describe('jotform list-form-submissions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-form-submissions',
        Model: 'ActionOutput_jotform_listformsubmissions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
