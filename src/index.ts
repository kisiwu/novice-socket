
export {SocketApp} from './app'
export {NspBuilder} from './nspBuilder'
import createSocketApp from './app'
import errorHandler from './utils/errorHandler'
import explodeData from './utils/explodeData'
import toArray from './utils/toArray'

/**
 * @description utils
 */
export const utils = {
  errorHandler,
  explodeData,
  toArray
};

export default createSocketApp;