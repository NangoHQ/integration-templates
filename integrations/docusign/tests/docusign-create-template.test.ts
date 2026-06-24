import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-template.js';

describe('docusign create-template tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-template',
        Model: 'ActionOutput_docusign_createtemplate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
