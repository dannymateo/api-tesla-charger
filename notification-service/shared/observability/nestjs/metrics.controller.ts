import { Controller, Get, Header, Res } from '@nestjs/common';
import { getMetricsContent } from '../metrics';

@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async metrics(@Res() res: { send: (body: string) => void }): Promise<void> {
    res.send(await getMetricsContent());
  }
}
