import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateLeafDto {
  @IsString()
  @MinLength(1, { message: 'O título da folha é obrigatório' })
  @MaxLength(100, { message: 'Título muito longo (máx. 100 caracteres)' })
  title: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  rawText?: string;
}
