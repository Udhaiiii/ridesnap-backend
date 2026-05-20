import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { ShortLinksService } from './short-links.service';

@Controller('p')
export class ShortLinksController {
  constructor(private readonly service: ShortLinksService) {}

  @Get(':code')
  async redirect(@Param('code') code: string, @Res() res: Response) {
    const { html, status } = await this.service.renderDownloadPage(code);
    return res.status(status).send(html);
  }
}
