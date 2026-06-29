import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-signing-groups.js';

describe('docusign list-signing-groups tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-signing-groups',
        Model: 'ActionOutput_docusign_listsigninggroups'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
