import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

@Injectable()
export class PrinterService {
  private readonly printerName: string;
  private readonly dpi: number;
  private readonly parkName: string;
  private readonly parkSub: string;

  constructor(config: ConfigService) {
    this.printerName = config.get('PRINTER_NAME', 'ZDesigner ZD621-203dpi ZPL');
    this.dpi = parseInt(config.get('PRINTER_DPI', '203'), 10);
    this.parkName = config.get('PARK_PRINT_NAME', 'Wonderla');
    this.parkSub = config.get('PARK_PRINT_SUBTITLE', 'Parks and Resorts');
  }

  generateWristbandZPL(wbId: string, date?: string): string {
    const dateStr =
      date ??
      new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    const W = Math.round(6 * this.dpi);
    const H = Math.round(1 * this.dpi);

    return `
^XA
^PW${W}
^LL${H}
^MNW
^MTD
^PON
^LH0,0
^FO12,8^A0N,52,48^FDW^FS
^FO12,62^GB48,3,3^FS
^FO68,6^A0N,26,26^FD${this.parkName}^FS
^FO68,36^A0N,18,18^FD${this.parkSub}^FS
^FO68,58^GB160,2,2^FS
^FO68,68^A0N,18,18^FDRIDE PHOTO PASS^FS
^FO265,8^BQN,2,5^FD${wbId}^FS
^FO490,10^A0N,36,36^FD${wbId}^FS
^FO490,55^A0N,20,20^FD${dateStr}^FS
^FO490,82^A0N,16,16^FDValid Today Only^FS
^FO480,8^GB2,185,2^FS
^XZ`.trim();
  }

  sendZPL(zplString: string): Promise<{ success: boolean }> {
    return new Promise((resolve, reject) => {
      const tmpFile = path.join(os.tmpdir(), `ridesnap_${Date.now()}.zpl`);
      try {
        fs.writeFileSync(tmpFile, zplString, 'binary');
        const cmd = `COPY /B "${tmpFile}" "${this.printerName}"`;
        exec(cmd, { shell: 'cmd.exe' }, (error) => {
          try {
            fs.unlinkSync(tmpFile);
          } catch {
            /* ignore */
          }
          if (error) reject(new Error(`Print failed: ${error.message}`));
          else resolve({ success: true });
        });
      } catch (err) {
        try {
          fs.unlinkSync(tmpFile);
        } catch {
          /* ignore */
        }
        reject(err);
      }
    });
  }

  async printWristbands(
    ids: string[],
    date?: string,
  ): Promise<Array<{ id: string; success: boolean; error?: string }>> {
    const results: Array<{ id: string; success: boolean; error?: string }> = [];
    for (const id of ids) {
      try {
        await this.sendZPL(this.generateWristbandZPL(id, date));
        results.push({ id, success: true });
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        results.push({
          id,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
    return results;
  }

  previewZPL(wbId: string, date?: string): string {
    return this.generateWristbandZPL(wbId, date);
  }
}
