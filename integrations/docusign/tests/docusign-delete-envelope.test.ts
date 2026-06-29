import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-envelope.js';

describe('docusign delete-envelope tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-envelope',
        Model: 'ActionOutput_docusign_deleteenvelope'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
