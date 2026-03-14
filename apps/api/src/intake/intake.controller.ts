import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { CreateEmailIntakeDto } from "./dto/create-email-intake.dto";
import { IntakeService } from "./intake.service";
import { IntakeKeyGuard } from "./intake-key.guard";

@Controller("intake")
export class IntakeController {
  constructor(private readonly intakeService: IntakeService) {}

  // n8n posts a parsed Yahoo alert payload to this route.
  @UseGuards(IntakeKeyGuard)
  @Post("email")
  createEmailIntake(@Body() body: CreateEmailIntakeDto) {
    return this.intakeService.createEmailIntake(body);
  }
}
