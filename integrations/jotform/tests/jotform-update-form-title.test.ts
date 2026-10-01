import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-form-title.js';

describe('jotform update-form-title tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-form-title',
        Model: 'ActionOutput_jotform_updateformtitle'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
