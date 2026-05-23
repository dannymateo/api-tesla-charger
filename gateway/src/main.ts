import "./instrumentation";
import { RequestMethod, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	app.setGlobalPrefix("api/v1", {
		exclude: [{ path: "metrics", method: RequestMethod.GET }],
	});
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			transform: true,
			forbidNonWhitelisted: true,
		}),
	);

	const openApiConfig = new DocumentBuilder()
		.setTitle("Tesla Supercharger Gateway API")
		.setDescription("API Gateway para la red Tesla Supercharger")
		.setVersion("1.0.0")
		.addBearerAuth(
			{
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
				description: "JWT access token",
			},
			"BearerAuth",
		)
		.build();

	const document = SwaggerModule.createDocument(app, openApiConfig);
	SwaggerModule.setup("docs", app, document);

	await app.listen(3000);
}

void bootstrap();
