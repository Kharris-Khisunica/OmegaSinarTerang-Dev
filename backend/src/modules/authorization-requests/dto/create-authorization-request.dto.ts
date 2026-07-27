import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class CreateAuthorizationRequestDto {
  @IsString()
  @IsNotEmpty()
  actionType: string;

  @IsObject()
  payload: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
