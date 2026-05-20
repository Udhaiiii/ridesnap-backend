import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsArray, ArrayMinSize } from 'class-validator';
import { PrinterService } from '../../infrastructure/printer/printer.service';

class PrintWristbandsDto {
  @IsArray()
  @ArrayMinSize(1)
  ids!: string[];
}

@Controller('api/print')
export class PrintController {
  constructor(private readonly printer: PrinterService) {}

  @Post('wristbands')
  async printWristbands(@Body() dto: PrintWristbandsDto) {
    if (dto.ids.length > 500) {
      return { success: false, error: 'Max 500 per print job' };
    }
    const today = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const results = await this.printer.printWristbands(dto.ids, today);
    const passed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    return {
      success: failed === 0,
      printed: passed,
      failed,
      results,
      message: `${passed}/${dto.ids.length} wristbands printed`,
    };
  }

  @Get('preview/:id')
  preview(@Param('id') id: string) {
    const zpl = this.printer.previewZPL(id.toUpperCase());
    return { success: true, id: id.toUpperCase(), zpl };
  }

  @Get('test')
  async test() {
    const today = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const results = await this.printer.printWristbands(['WB-TEST'], today);
    return { success: true, message: 'Test wristband sent to printer', results };
  }
}
