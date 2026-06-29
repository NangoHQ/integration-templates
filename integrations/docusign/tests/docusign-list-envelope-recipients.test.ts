import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-envelope-recipients.js';

describe('docusign list-envelope-recipients tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-envelope-recipients',
        Model: 'ActionOutput_docusign_listenveloperecipients'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
