import { vi, expect, it, describe } from 'vitest';

import runAction from '../actions/restore-quarantine-item.js';

describe('bitdefender restore-quarantine-item tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'restore-quarantine-item',
        Model: 'RestoreQuarantineItemOutput'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await runAction(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
