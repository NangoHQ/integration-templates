import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-permission.js';

describe('coda add-permission tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-permission',
        Model: 'ActionOutput_coda_addpermission'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
