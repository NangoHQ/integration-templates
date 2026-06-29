import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-permission-profiles.js';

describe('docusign list-permission-profiles tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-permission-profiles',
        Model: 'ActionOutput_docusign_listpermissionprofiles'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
