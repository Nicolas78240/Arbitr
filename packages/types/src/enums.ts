export enum SessionStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export enum Axis {
  X = 'X',
  Y = 'Y',
}

export enum FieldType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  NUMBER = 'NUMBER',
  SELECT = 'SELECT',
  EMAIL = 'EMAIL',
  URL = 'URL',
}

export enum Role {
  ADMIN = 'ADMIN',
  EVALUATOR = 'EVALUATOR',
  TEAM = 'TEAM',
}

export type QuadrantPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
