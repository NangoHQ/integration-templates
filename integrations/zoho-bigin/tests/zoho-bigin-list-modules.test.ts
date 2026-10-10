import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-modules.js';

describe('zoho-bigin list-modules tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-modules',
        Model: 'ActionOutput_zoho_bigin_listmodules'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
