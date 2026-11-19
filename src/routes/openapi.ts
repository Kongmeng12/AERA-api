import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { appConfig } from '../config/app.config';
import { openApiRegistry } from '../shared/openapi/registry';
import '../modules/auth/routes/auth.openapi';
import '../modules/inventory/routes/inventory.openapi';
import '../modules/master-data/routes/master-data.openapi';
import '../modules/purchasing/routes/purchasing.openapi';
import '../modules/roles/routes/roles.openapi';
import '../modules/users/routes/users.openapi';

export function buildOpenApiDocument() {
  return new OpenApiGeneratorV31(openApiRegistry.definitions).generateDocument({
    openapi: '3.1.0',
    info: { title: 'Aera Mineral API', version: '1.0.0' },
    servers: [{ url: appConfig.apiBasePath }],
  });
}

export function createDocsRouter(): Router {
  const document = buildOpenApiDocument();
  const router = Router();
  router.get('/openapi.json', (_req, res) => {
    res.json(document);
  });
  router.use('/', swaggerUi.serve, swaggerUi.setup(document));
  return router;
}
