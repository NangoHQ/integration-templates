import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-envelope-recipients.js';

describe('docusign delete-envelope-recipients tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-envelope-recipients',
        Model: 'ActionOutput_docusign_deleteenveloperecipients'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
