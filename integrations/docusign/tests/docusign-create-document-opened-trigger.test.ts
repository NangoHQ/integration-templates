import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-document-opened-trigger.js';

describe('docusign create-document-opened-trigger tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-document-opened-trigger',
        Model: 'ActionOutput_docusign_sandbox_createdocumentopenedtrigger'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
