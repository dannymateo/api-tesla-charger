# notification-service

Microservicio NestJS aislado para envío asíncrono de correos vía SMTP (Gmail).

Recibe eventos `notification.send` desde RabbitMQ y renderiza plantillas HTML al estilo Tesla Supercharger.

El header usa el logo `tesla.svg` del front (convertido a PNG embebido para compatibilidad con Gmail).

Si actualizas el SVG, regenera el PNG:

```bash
npm run generate:logo
```

## Variables

Ver `.env.example`. Para Gmail usa una **contraseña de aplicación** (no la contraseña de la cuenta).

## Ejecutar en local

```bash
npm install
npm run start:dev
```
