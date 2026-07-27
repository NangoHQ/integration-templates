import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-custom-category.js';

describe('dope-security create-custom-category tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-custom-category',
        Model: 'ActionOutput_dope_security_createcustomcategory'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
