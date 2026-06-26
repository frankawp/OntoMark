/**
 * Wiki 预览服务器停止
 */
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export async function serveStop(projectPath: string): Promise<{
  success: boolean;
  message: string;
}> {
  const pidPath = path.join(projectPath, '.ontomark', 'serve.pid');

  // 读取 PID 文件
  if (!fs.existsSync(pidPath)) {
    return { success: false, message: '未找到运行中的服务器（无 PID 文件）' };
  }

  try {
    const data = JSON.parse(fs.readFileSync(pidPath, 'utf-8'));
    const { pid, port } = data;

    // 尝试杀死进程
    try {
      if (process.platform === 'win32') {
        // Windows: 使用 taskkill
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' });
      } else {
        // Linux/macOS: 使用 kill
        process.kill(pid, 'SIGTERM');
      }

      // 清理 PID 文件
      fs.unlinkSync(pidPath);

      return { success: true, message: `服务器已停止 (PID: ${pid}, 端口: ${port})` };
    } catch (err: any) {
      // 进程可能已经不存在
      fs.unlinkSync(pidPath);
      return { success: false, message: `进程已不存在 (PID: ${pid})` };
    }
  } catch (err: any) {
    return { success: false, message: `读取 PID 文件失败: ${err.message}` };
  }
}
