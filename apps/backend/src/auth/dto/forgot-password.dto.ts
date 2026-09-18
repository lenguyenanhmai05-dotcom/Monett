import { IsEmail, IsNotEmpty } from 'class-validator';
import { ForgotPasswordDto as IForgotPasswordDto } from '@monett/shared';

export class ForgotPasswordDto implements IForgotPasswordDto {
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;
}
