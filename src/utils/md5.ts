import * as crypto from 'crypto';
import * as fs from 'fs/promises';

export function md5(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

export async function md5File(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf-8');
  return md5(content);
}
