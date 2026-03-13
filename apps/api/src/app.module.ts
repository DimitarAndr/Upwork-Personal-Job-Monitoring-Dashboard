import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { IntakeModule } from "./intake/intake.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [PrismaModule, IntakeModule],
  controllers: [HealthController],
  providers: []
})
export class AppModule {}
