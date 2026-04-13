import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[\p{L}\p{N} _-]+$/u)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  parentPath?: string;
}
