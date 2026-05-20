import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('RideSnap API')
    .setDescription(
      'Amusement park photo system — visits, photos, orders, print queue, wristbands, reports.',
    )
    .setVersion('2.0.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-auth-token',
        in: 'header',
        description: 'Session token from POST /api/auth/login',
      },
      'session',
    )
    .addTag('auth')
    .addTag('health')
    .addTag('visits')
    .addTag('photos')
    .addTag('orders')
    .addTag('wristbands')
    .addTag('print-queue')
    .addTag('stats')
    .addTag('reports')
    .addTag('users')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
