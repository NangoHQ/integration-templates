import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-envelope.js';

describe('docusign update-envelope tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-envelope',
        Model: 'ActionOutput_docusign_updateenvelope'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
