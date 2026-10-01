import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/submit-form-by-field-label.js';

describe('jotform submit-form-by-field-label tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'submit-form-by-field-label',
        Model: 'ActionOutput_jotform_submitformbyfieldlabel'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
