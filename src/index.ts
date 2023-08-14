import createServerApp from './app'
import errorHandler from './utils/errorHandler'
import { explodeData } from './utils/explodeData'

/**
 * @description utils
 */
export const utils = {
  errorHandler,
  explodeData
};

export * from './app'
export * from './nspBuilder'
export * from './listenerBuilder'
export * from './definitions'

export default createServerApp;
