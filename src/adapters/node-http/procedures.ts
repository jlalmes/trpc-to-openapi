import { OpenApiMethod, OpenApiProcedure, OpenApiRouter } from '../../types';
import { getPathRegExp, normalizePath } from '../../utils/path';
import { forEachOpenApiProcedure } from '../../utils/procedure';

export const createProcedureCache = (router: OpenApiRouter) => {
  const procedureCache = new Map<
    OpenApiMethod | 'HEAD',
    Map<
      RegExp,
      {
        type: 'query' | 'mutation';
        path: string;
        procedure: OpenApiProcedure;
      }
    >
  >();

  forEachOpenApiProcedure(router._def.procedures, ({ path: queryPath, procedure, openapi }) => {
    if (procedure._def.type === 'subscription') {
      return;
    }
    const { method } = openapi;
    if (!procedureCache.has(method)) {
      procedureCache.set(method, new Map());
    }
    const path = normalizePath(openapi.path);
    const pathRegExp = getPathRegExp(path);
    procedureCache.get(method)?.set(pathRegExp, {
      type: procedure._def.type,
      path: queryPath,
      procedure,
    });
  });

  return (method: OpenApiMethod | 'HEAD', path: string) => {
    const procedureMethodCache = procedureCache.get(method);
    if (!procedureMethodCache) {
      return undefined;
    }

    const procedureRegExp = Array.from(procedureMethodCache.keys()).find((re) => re.test(path));
    if (!procedureRegExp) {
      return undefined;
    }

    const procedure = procedureMethodCache.get(procedureRegExp);
    const pathInput = procedureRegExp.exec(path)?.groups ?? {};

    return { procedure, pathInput };
  };
};
