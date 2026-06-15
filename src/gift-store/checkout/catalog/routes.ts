import type { FastifyInstance } from 'fastify';
import type { Context } from 'unleash-client';
import { CATALOG, catalogWithImages } from '@gift-store/commerce';
import type { Config } from '../support/config';
import { headerStr, requestContext } from '../support/request-context';

export interface CatalogDeps {
  /** When ON, the catalog endpoint attaches image URLs — evaluated server-side per request. */
  readonly isProductImagesEnabled: (context: Context) => boolean;
}

export const registerCatalogRoutes = (
  app: FastifyInstance,
  config: Config,
  deps: CatalogDeps,
): void => {
  // The product-images flag is enforced server-side: image URLs are attached only when the
  // flag is ON for this request's context. The browser renders whatever it receives, so a
  // client-side toolbar override cannot surface images the back end withheld.
  app.get('/catalog', (req) => {
    const context = requestContext(req, config, headerStr(req.headers['x-user-id']));
    return deps.isProductImagesEnabled(context) ? catalogWithImages() : CATALOG;
  });
};
