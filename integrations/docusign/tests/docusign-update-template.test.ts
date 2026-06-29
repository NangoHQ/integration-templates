import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-template.js';

describe('docusign update-template tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-template',
        Model: 'ActionOutput_docusign_updatetemplate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
