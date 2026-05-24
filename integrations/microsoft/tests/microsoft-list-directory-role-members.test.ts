import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-directory-role-members.js';

describe('microsoft list-directory-role-members tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-directory-role-members',
        Model: 'ActionOutput_microsoft_listdirectoryrolemembers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
