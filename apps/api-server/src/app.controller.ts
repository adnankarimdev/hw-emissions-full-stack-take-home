import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHealth() {
    return {
      service: 'emissions-api',
      status: 'ok',
    };
  }
}
