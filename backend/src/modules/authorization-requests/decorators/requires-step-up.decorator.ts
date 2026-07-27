import { SetMetadata } from '@nestjs/common';

export const STEP_UP_KEY = 'stepUpActionType';

export const RequiresStepUp = (actionType: string) =>
  SetMetadata(STEP_UP_KEY, actionType);
