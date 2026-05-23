import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health del Gateway' })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        service: 'gateway',
      },
    },
  })
  getHealth() {
    return {
      status: 'ok',
      service: 'gateway',
    };
  }
}
