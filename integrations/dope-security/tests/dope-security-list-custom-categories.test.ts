import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-custom-categories.js';

describe('dope-security list-custom-categories tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-custom-categories',
        Model: 'ActionOutput_dope_security_listcustomcategories'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
