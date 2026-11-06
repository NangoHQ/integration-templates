import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-event-subscription.js';

describe('docusign create-event-subscription tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-event-subscription',
        Model: 'ActionOutput_docusign_sandbox_createeventsubscription'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
