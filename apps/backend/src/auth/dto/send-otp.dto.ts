import { IsEmail, IsNotEmpty } from 'class-validator';
import { SendOtpDto as ISendOtpDto } from '@monett/shared';

export class SendOtpDto implements ISendOtpDto {
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;
}
