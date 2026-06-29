import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-group-users.js';

describe('docusign list-group-users tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-group-users',
        Model: 'ActionOutput_docusign_listgroupusers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
