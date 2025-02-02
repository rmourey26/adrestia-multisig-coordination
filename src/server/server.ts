import fastify, { FastifyInstance } from 'fastify';
import fastifyBlipp from 'fastify-blipp';
import metricsPlugin from 'fastify-metrics';
import openapiGlue from 'fastify-openapi-glue';
import { IncomingMessage, Server, ServerResponse } from 'http';
import * as Controllers from './controllers/controllers';
import { Services } from './services/services';
import { MAX_CHANNEL_LENGTH } from './utils/constants';

/**
 * This function builds a Fastify instance connecting the services with the
 * corresponding fastify route handlers.
 *
 * @param {*} servicesFactory to be used to handle the requests
 * @param {string} logLevel indicates up to which level to log into console
 * @returns {*} a server instance
 */
const buildServer = (
  servicesFactory: (httpServer: Server) => Services,
  logLevel: string
): FastifyInstance<Server, IncomingMessage, ServerResponse> => {
  const server = fastify({
    logger: { level: logLevel },
    maxParamLength: MAX_CHANNEL_LENGTH + 1
  });
  server.register(fastifyBlipp);
  server.register(openapiGlue, {
    specification: `${__dirname}/api/openApi.json`,
    service: Controllers.configure(servicesFactory(server.server)),
    noAdditional: true
  });
  server.register(metricsPlugin, { endpoint: '/metrics' });
  return server;
};

export default buildServer;
