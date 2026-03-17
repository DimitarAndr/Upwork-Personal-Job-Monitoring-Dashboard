import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { IntakeModule } from "./intake/intake.module";
import { LeadsModule } from "./leads/leads.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [PrismaModule, IntakeModule, LeadsModule],
  controllers: [HealthController],
  providers: []
})
export class AppModule {}
