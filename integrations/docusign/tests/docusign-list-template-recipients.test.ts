import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-template-recipients.js';

describe('docusign list-template-recipients tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-template-recipients',
        Model: 'ActionOutput_docusign_listtemplaterecipients'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
