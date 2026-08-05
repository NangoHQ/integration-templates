import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-deal-won-reasons.js';

describe('pipelinecrm list-deal-won-reasons tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-deal-won-reasons',
        Model: 'ActionOutput_pipelinecrm_listdealwonreasons'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
