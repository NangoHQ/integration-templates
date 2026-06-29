import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-group-users.js';

describe('docusign remove-group-users tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-group-users',
        Model: 'ActionOutput_docusign_removegroupusers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
