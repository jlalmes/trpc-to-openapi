import { AnyRouter } from '@trpc/server';
import { FastifyInstance } from 'fastify';

import { OpenApiRouter } from '../types';
import {
  CreateOpenApiNodeHttpHandlerOptions,
  createOpenApiNodeHttpHandler,
} from './node-http/core';

export type CreateOpenApiFastifyPluginOptions<TRouter extends OpenApiRouter> =
  CreateOpenApiNodeHttpHandlerOptions<TRouter, any, any> & {
    basePath?: `/${string}`;
  };

export function fastifyTRPCOpenApiPlugin<TRouter extends AnyRouter>(
  fastify: FastifyInstance,
  opts: CreateOpenApiFastifyPluginOptions<TRouter>,
  done: (err?: Error) => void,
) {
  let prefix = opts.basePath ?? '';

  // if prefix ends with a slash, remove it
  if (prefix.endsWith('/')) {
    prefix = prefix.slice(0, -1);
  }

  const openApiHttpHandler = createOpenApiNodeHttpHandler(opts);

  fastify.all(`${prefix}/*`, async (request, reply) => {
    const prefixRemovedFromUrl = request.url.replace(fastify.prefix, '').replace(prefix, '');
    const rawRequest = Object.assign(request.raw, {
      body: request.body,
      url: prefixRemovedFromUrl,
    });
    return await openApiHttpHandler(
      rawRequest,
      Object.assign(reply, {
        setHeader: (key: string, value: string | number | readonly string[]) => {
          if (Array.isArray(value)) {
            value.forEach((v) => reply.header(key, v));
            return reply;
          }

          return reply.header(key, value);
        },
        end: (body: any) => reply.send(body),
      }),
    );
  });

  done();
}
