import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-groups.js';

describe('docusign delete-groups tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-groups',
        Model: 'ActionOutput_docusign_deletegroups'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
