export type LegalTextType =
  | "imprint"
  | "privacyPolicy"
  | "privacyPolicySocialMedia"

export interface LegalText {
  // Die LegalText-Endpunkte liefern selbst kein `type`-Feld - daher optional.
  type?: LegalTextType
  html_de: string
  html_en: string | null
  warnings: string | null
  pushed: string | null
  created: string
  modified: string
}

export interface ERecht24Client {
  id: number
  secret: string
  pushUri: string
  pushMethod: "POST"
  cms: string
  cmsVersion: string
  pluginName: string
  authorMail: string
  created?: string
  modified?: string
}

export interface CreateClientInput {
  pushUri: string
  pushMethod?: "POST"
  cms: string
  cmsVersion: string
  pluginName: string
  authorMail: string
}

export interface PushPayload {
  erecht24_secret: string
  erecht24_type: "ping" | LegalTextType
}
