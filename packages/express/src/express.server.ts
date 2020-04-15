// Copyright IBM Corp. 2020. All Rights Reserved.
// Node module: @loopback/express
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  Binding,
  BindingAddress,
  Constructor,
  Context,
  CoreBindings,
  inject,
  isBindingAddress,
  Provider,
  Server,
} from '@loopback/core';
import {HttpServer, HttpServerOptions} from '@loopback/http-server';
import debugFactory from 'debug';
import express from 'express';
import {
  invokeMiddleware,
  registerExpressMiddleware,
  registerMiddleware,
} from './middleware';
import {
  ExpressMiddlewareFactory,
  ExpressRequestHandler,
  Middleware,
  MiddlewareBindingOptions,
  MiddlewareContext,
  Request,
} from './types';

const debug = debugFactory('loopback:middleware');

/**
 * Configuration for a LoopBack based Express server
 */
export type ExpressServerConfig = HttpServerOptions & {
  /**
   * Base path to mount the LoopBack middleware chain
   */
  basePath?: string;
  /**
   * Express settings
   */
  settings?: Record<string, unknown>;
};

/**
 * A factory function to create an Express middleware handler to invoke
 * registered LoopBack-style middleware in a chain.
 * @param ctx - Context object
 */
export function middlewareChain(ctx: Context): ExpressRequestHandler {
  return async (req, res, next) => {
    const middlewareCtx = new MiddlewareContext(req, res, ctx);
    // Set the middleware context to `request` object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any)[ExpressServer.MIDDLEWARE_CONTEXT] = middlewareCtx;

    try {
      const result = await invokeMiddleware(middlewareCtx);
      if (result !== res) {
        next();
      }
    } catch (err) {
      next(err);
    }
  };
}

/**
 * An Express server that provides middleware composition and injection
 */
export class ExpressServer extends Context implements Server {
  /**
   * A symbol to store `MiddlewareContext` on the request object
   */
  static MIDDLEWARE_CONTEXT = Symbol('loopback.middle.context');
  /**
   * Base path to mount middleware
   */
  readonly basePath: string;
  /**
   * Embedded Express application
   */
  readonly expressApp: express.Application;

  /**
   * HTTP/HTTPS server
   */
  protected httpServer: HttpServer;
  constructor(
    @inject(CoreBindings.APPLICATION_CONFIG.deepProperty('express'))
    protected readonly config?: ExpressServerConfig,
    @inject(CoreBindings.APPLICATION_INSTANCE)
    parent?: Context,
  ) {
    super(parent);
    let basePath = config?.basePath ?? '';
    // Trim leading and trailing `/`
    basePath = basePath.replace(/(^\/)|(\/$)/, '');
    if (basePath) basePath = '/' + basePath;
    this.basePath = basePath;

    this.expressApp = express();
    if (config?.settings) {
      for (const p in config?.settings) {
        this.expressApp.set(p, config?.settings[p]);
      }
    }
    this.httpServer = new HttpServer(this.expressApp, config);

    // Set up the middleware chain as the 1st Express middleware
    this.expressApp.use(this.basePath, middlewareChain(this));
  }

  /**
   * Some of the methods below are copied from RestServer
   * TODO(rfeng): We might want to refactor some methods from RestServer into
   * the base ExpressServer.
   */
  get listening(): boolean {
    return this.httpServer ? this.httpServer.listening : false;
  }

  /**
   * The base url for the server, including the basePath if set. For example,
   * the value will be 'http://localhost:3000/api' if `basePath` is set to
   * '/api'.
   */
  get url(): string | undefined {
    let serverUrl = this.rootUrl;
    if (!serverUrl) return serverUrl;
    serverUrl = serverUrl + this.basePath;
    return serverUrl;
  }

  /**
   * The root url for the server without the basePath. For example, the value
   * will be 'http://localhost:3000' regardless of the `basePath`.
   */
  get rootUrl(): string | undefined {
    return this.httpServer && this.httpServer.url;
  }

  async start() {
    await this.httpServer.start();
    debug('ExpressServer listening at %s', this.httpServer.url);
  }

  stop() {
    return this.httpServer.stop();
  }

  /**
   * Bind an Express middleware to this server context
   *
   * @example
   * ```ts
   * import myExpressMiddlewareFactory from 'my-express-middleware';
   * const myExpressMiddlewareConfig= {};
   * const myExpressMiddleware = myExpressMiddlewareFactory(myExpressMiddlewareConfig);
   * server.expressMiddleware('middleware.express.my', myExpressMiddleware);
   * ```
   * @param key - Middleware binding key
   * @param middleware - Express middleware handler function
   *
   */
  expressMiddleware(
    key: BindingAddress,
    middleware: ExpressRequestHandler,
    options?: MiddlewareBindingOptions,
  ): Binding<Middleware>;

  /**
   * Bind an Express middleware to this server context
   *
   * @example
   * ```ts
   * import myExpressMiddlewareFactory from 'my-express-middleware';
   * const myExpressMiddlewareConfig= {};
   * server.expressMiddleware(myExpressMiddlewareFactory, myExpressMiddlewareConfig);
   * ```
   * @param middlewareFactory - Middleware module name or factory function
   * @param middlewareConfig - Middleware config
   * @param options - Options for registration
   *
   * @typeParam CFG - Configuration type
   */
  expressMiddleware<CFG>(
    middlewareFactory: ExpressMiddlewareFactory<CFG>,
    middlewareConfig?: CFG,
    options?: MiddlewareBindingOptions,
  ): Binding<Middleware>;

  /**
   * @internal
   *
   * This signature is only used by RestApplication for delegation
   */
  expressMiddleware<CFG>(
    factoryOrKey: ExpressMiddlewareFactory<CFG> | BindingAddress<Middleware>,
    configOrHandler: CFG | ExpressRequestHandler,
    options?: MiddlewareBindingOptions,
  ): Binding<Middleware>;

  /**
   * @internal
   * Implementation of `expressMiddleware`
   */
  expressMiddleware<CFG>(
    factoryOrKey: ExpressMiddlewareFactory<CFG> | BindingAddress<Middleware>,
    configOrHandler: CFG | ExpressRequestHandler,
    options: MiddlewareBindingOptions = {},
  ): Binding<Middleware> {
    const key = factoryOrKey as BindingAddress<Middleware>;
    if (isBindingAddress(key)) {
      const handler = configOrHandler as ExpressRequestHandler;
      return registerExpressMiddleware<CFG>(this, () => handler, undefined, {
        ...options,
        key,
        injectConfiguration: false,
      });
    } else {
      return registerExpressMiddleware(
        this,
        factoryOrKey as ExpressMiddlewareFactory<CFG>,
        configOrHandler as CFG,
        options,
      );
    }
  }

  /**
   * Register a middleware function or provider class
   *
   * @example
   * ```ts
   * const log: Middleware = async (requestCtx, next) {
   *   // ...
   * }
   * server.middleware(log);
   * ```
   *
   * @param middleware - Middleware function or provider class
   * @param options - Middleware binding options
   */
  middleware(
    middleware: Middleware | Constructor<Provider<Middleware>>,
    options: MiddlewareBindingOptions = {},
  ): Binding<Middleware> {
    return registerMiddleware(this, middleware, options);
  }

  /**
   * Retrieve the middleware context from the request
   * @param request - Request object
   */
  getMiddlewareContext(request: Request): MiddlewareContext | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (request as any)[ExpressServer.MIDDLEWARE_CONTEXT];
  }
}
