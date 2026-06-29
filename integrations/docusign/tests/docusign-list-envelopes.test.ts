import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-envelopes.js';

describe('docusign list-envelopes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-envelopes',
        Model: 'ActionOutput_docusign_listenvelopes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
