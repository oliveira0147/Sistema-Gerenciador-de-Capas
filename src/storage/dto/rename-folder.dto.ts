import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class RenameFolderDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  path?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[\p{L}\p{N} _-]+$/u)
  newName!: string;
}
