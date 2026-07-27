import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-custom-category-urls.js';

describe('dope-security delete-custom-category-urls tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-custom-category-urls',
        Model: 'ActionOutput_dope_security_deletecustomcategoryurls'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
