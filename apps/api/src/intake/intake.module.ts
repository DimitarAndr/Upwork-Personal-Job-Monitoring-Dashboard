import { Module } from "@nestjs/common";
import { IntakeController } from "./intake.controller";
import { IntakeKeyGuard } from "./intake-key.guard";
import { IntakeService } from "./intake.service";

@Module({
  controllers: [IntakeController],
  providers: [IntakeService, IntakeKeyGuard]
})
export class IntakeModule {}
