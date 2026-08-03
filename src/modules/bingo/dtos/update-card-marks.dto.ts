import { IsNotEmptyObject, IsObject } from 'class-validator';

export class UpdateCardMarksDto {
  @IsObject()
  @IsNotEmptyObject()
  marks: Record<string, any>;
}
