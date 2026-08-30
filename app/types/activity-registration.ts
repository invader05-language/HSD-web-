export type ActivityRegistrationFieldType = "text" | "textarea" | "phone" | "number" | "date" | "single" | "multi" | "checkbox";

export interface ActivityRegistrationField {
  id: string;
  type: ActivityRegistrationFieldType;
  label: string;
  helpText?: string;
  required: boolean;
  order: number;
  options?: string[];
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  maxItems?: number;
}

export interface ActivityRegistrationForm {
  revisionId: string;
  version: number;
  fields: ActivityRegistrationField[];
}

export type ActivityRegistrationAnswers = Record<string, string | number | boolean | string[] | undefined>;
