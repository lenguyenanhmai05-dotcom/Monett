import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { VerifyOtpDto as IVerifyOtpDto } from '@monett/shared';

export class VerifyOtpDto implements IVerifyOtpDto {
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @IsString({ message: 'Mã xác thực OTP không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng nhập mã xác thực OTP gửi qua Email' })
  @Length(6, 6, { message: 'Mã xác thực OTP phải gồm đúng 6 chữ số' })
  otp: string;
}
