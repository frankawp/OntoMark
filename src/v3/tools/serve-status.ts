/**
 * Wiki 预览服务器状态检查
 */
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

export async function serveStatus(projectPath: string): Promise<{
  running: boolean;
  pid?: number;
  port?: number;
  started?: string;
  url?: string;
}> {
  const pidPath = path.join(projectPath, '.ontomark', 'serve.pid');

  // 读取 PID 文件
  if (!fs.existsSync(pidPath)) {
    return { running: false };
  }

  try {
    const data = JSON.parse(fs.readFileSync(pidPath, 'utf-8'));
    const { pid, port, started } = data;

    // 检查进程是否存活
    try {
      // Windows: tasklist, Linux/macOS: ps
      process.kill(pid, 0); // 信号 0 只检查进程是否存在，不实际杀死
    } catch {
      // 进程不存在，清理 PID 文件
      fs.unlinkSync(pidPath);
      return { running: false };
    }

    // 检查 HTTP 服务是否响应
    const url = `http://localhost:${port}`;
    let httpRunning = false;
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.request(`${url}/api/index`, { method: 'GET', timeout: 2000 }, (res) => {
          if (res.statusCode === 200) {
            httpRunning = true;
            resolve();
          } else {
            reject(new Error('HTTP error'));
          }
        });
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
        req.end();
      });
    } catch {
      httpRunning = false;
    }

    return {
      running: httpRunning,
      pid,
      port,
      started,
      url
    };
  } catch {
    return { running: false };
  }
}