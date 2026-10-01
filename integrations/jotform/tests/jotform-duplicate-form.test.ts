import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/duplicate-form.js';

describe('jotform duplicate-form tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'duplicate-form',
        Model: 'ActionOutput_jotform_duplicateform'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
