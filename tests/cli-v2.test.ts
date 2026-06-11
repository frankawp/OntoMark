import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('CLI V2 Commands', () => {
  it('should have extract command', async () => {
    const { stdout } = await execAsync('node dist/cli.js --help');
    expect(stdout).toContain('extract');
  });

  it('should have link command', async () => {
    const { stdout } = await execAsync('node dist/cli.js --help');
    expect(stdout).toContain('link');
  });

  it('should have build command', async () => {
    const { stdout } = await execAsync('node dist/cli.js --help');
    expect(stdout).toContain('build');
  });
});