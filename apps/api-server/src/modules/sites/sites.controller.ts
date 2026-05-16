import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { CreateSiteRequest } from './dto/create-site.dto';
import { createSiteSchema } from './dto/create-site.dto';
import { SitesService } from './sites.service';
import { ZodValidationPipe } from '../../shared/validation/zod-validation.pipe';

@Controller('sites')
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Post()
  createSite(
    @Body(new ZodValidationPipe(createSiteSchema)) body: CreateSiteRequest,
  ) {
    return this.sitesService.createSite(body);
  }

  @Get()
  listSites() {
    return this.sitesService.listSites();
  }

  @Get(':id/metrics')
  getSiteMetrics(@Param('id') siteId: string) {
    return this.sitesService.getSiteMetrics(siteId);
  }
}
