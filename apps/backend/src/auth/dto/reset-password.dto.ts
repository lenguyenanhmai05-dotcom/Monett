import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';
import { ResetPasswordDto as IResetPasswordDto } from '@monett/shared';

export class ResetPasswordDto implements IResetPasswordDto {
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @IsString({ message: 'Mã xác thực OTP không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng nhập mã xác thực OTP gửi qua Email' })
  @Length(6, 6, { message: 'Mã xác thực OTP phải gồm đúng 6 chữ số' })
  otp: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới phải có tối thiểu 8 ký tự' })
  @Matches(
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>~`])[A-Za-z\d@$!%*?&#^()_+\-=[\]{};':"\\|,.<>~`]{8,}$/,
    {
      message:
        'Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm cả chữ cái, chữ số và ký tự đặc biệt (@, #, $, %, ...)',
    },
  )
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  newPassword: string;
}
