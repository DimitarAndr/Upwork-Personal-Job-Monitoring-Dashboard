import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");

  const logger = new Logger("Http");
  app.use((
    request: { method: string; originalUrl: string },
    response: { statusCode: number; on: (event: string, listener: () => void) => void },
    next: () => void
  ) => {
    const startedAt = Date.now();

    response.on("finish", () => {
      logger.log(
        `${request.method} ${request.originalUrl} ${response.statusCode} ${Date.now() - startedAt}ms`
      );
    });

    next();
  });

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
}

bootstrap();
