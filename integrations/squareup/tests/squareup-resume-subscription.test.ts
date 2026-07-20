import { expect, it, describe } from 'vitest';

import createAction from '../actions/resume-subscription.js';

describe('squareup resume-subscription tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'resume-subscription',
        Model: 'ActionOutput_squareup_resumesubscription'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
