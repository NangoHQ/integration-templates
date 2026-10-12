import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-module-fields.js';

describe('zoho-bigin get-module-fields tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-module-fields',
        Model: 'ActionOutput_zoho_bigin_getmodulefields'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
