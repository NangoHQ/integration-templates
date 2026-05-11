import { vi, expect, it, describe, beforeEach } from 'vitest';

import createAction from '../actions/update-estimate.js';

describe('quickbooks update-estimate tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-estimate',
        Model: 'ActionOutput_quickbooks_sandbox_updateestimate'
    });

    beforeEach(() => {
        nangoMock.getConnection = vi.fn(async () => ({
            connection_config: {
                realmId: '9341457021722202'
            }
        }));
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
