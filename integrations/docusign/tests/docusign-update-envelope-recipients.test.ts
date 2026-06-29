import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-envelope-recipients.js';

describe('docusign update-envelope-recipients tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-envelope-recipients',
        Model: 'ActionOutput_docusign_updateenveloperecipients'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
