import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-custom-category-url.js';

describe('dope-security delete-custom-category-url tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-custom-category-url',
        Model: 'ActionOutput_dope_security_deletecustomcategoryurl'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
