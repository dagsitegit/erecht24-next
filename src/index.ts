export {
  getLegalText,
  createClient,
  listClients,
  deleteClient,
  triggerTestPush,
  legalTextTag,
  ERECHT24_TAG_PREFIX,
} from "./client"

export { createErecht24PushRoute } from "./push-route"
export type { PushRouteOptions } from "./push-route"

export { LegalText } from "./legal-text"
export type { LegalTextProps } from "./legal-text"

export type {
  LegalTextType,
  ERecht24Client,
  CreateClientInput,
  PushPayload,
} from "./types"
