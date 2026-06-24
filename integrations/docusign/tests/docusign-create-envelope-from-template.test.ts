import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-envelope-from-template.js';

describe('docusign create-envelope-from-template tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-envelope-from-template',
        Model: 'ActionOutput_docusign_createenvelopefromtemplate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
