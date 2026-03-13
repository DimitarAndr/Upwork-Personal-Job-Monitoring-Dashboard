import { Body, Controller, Post } from "@nestjs/common";
import { CreateEmailIntakeDto } from "./dto/create-email-intake.dto";
import { IntakeService } from "./intake.service";

@Controller("intake")
export class IntakeController {
  constructor(private readonly intakeService: IntakeService) {}

  @Post("email")
  createEmailIntake(@Body() body: CreateEmailIntakeDto) {
    return this.intakeService.createEmailIntake(body);
  }
}
