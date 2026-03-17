import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { CreateLeadEnrichmentDto } from "./dto/create-lead-enrichment.dto";
import { LeadsService } from "./leads.service";

@Controller("leads")
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  listLeads(@Query("limit") limit?: string) {
    return this.leadsService.listLeads(limit);
  }

  @Post(":leadId/enrich")
  enrichLead(
    @Param("leadId") leadId: string,
    @Body() body: CreateLeadEnrichmentDto
  ) {
    return this.leadsService.enrichLead(leadId, body);
  }
}
