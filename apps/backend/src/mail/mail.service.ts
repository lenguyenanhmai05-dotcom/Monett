import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASS');

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
      this.logger.log(`📧 Dịch vụ Mail đã sẵn sàng với tài khoản: ${user}`);
    } else {
      this.logger.warn(
        '⚠️ Chưa cấu hình MAIL_USER/MAIL_PASS trong .env. Mã OTP sẽ hiển thị trên console và trả về giao diện để thử nghiệm tiện lợi!',
      );
    }
  }

  async sendOtpEmail(toEmail: string, otpCode: string): Promise<boolean> {
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
        <!-- Header Xanh Ngọc Monett -->
        <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 28px 24px; text-align: center; color: #FFFFFF;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">Monett.</h1>
          <p style="margin: 6px 0 0 0; font-size: 13.5px; opacity: 0.95; font-weight: 500;">Nhật Ký Chi Tiêu & Khoảnh Khắc Tài Chính</p>
        </div>

        <!-- Body -->
        <div style="padding: 28px 24px; background-color: #FFFFFF;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="font-size: 38px;">🐸</span>
            <h2 style="color: #0F172A; font-size: 20px; margin: 10px 0 6px 0;">Xác Nhận Đăng Ký Tài Khoản</h2>
            <p style="color: #64748B; font-size: 13.5px; margin: 0; line-height: 1.5;">
              Bé Ếch Monett đã nhận được yêu cầu đăng ký tài khoản với email <strong style="color: #0F172A;">${toEmail}</strong>.
            </p>
          </div>

          <!-- Khung Mã OTP Nổi Bật -->
          <div style="background-color: #ECFDF5; border: 2px dashed #10B981; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #047857; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Mã Xác Thực OTP Của Bạn</p>
            <div style="font-size: 32px; font-weight: 800; color: #065F46; letter-spacing: 6px; font-family: monospace;">${otpCode}</div>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #059669;">(Mã có hiệu lực trong vòng <strong>5 phút</strong>)</p>
          </div>

          <p style="color: #94A3B8; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
            Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email. Tuyệt đối không chia sẻ mã OTP cho bất kỳ ai.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #F1F5F9; padding: 14px 20px; text-align: center; border-top: 1px solid #E2E8F0;">
          <p style="margin: 0; font-size: 11.5px; color: #64748B;">© 2026 Monett Finance Moments. All rights reserved.</p>
        </div>
      </div>
    `;

    if (this.transporter) {
      try {
        const mailFrom =
          this.configService.get<string>('MAIL_FROM') ||
          `"Monett Finance" <${this.configService.get<string>('MAIL_USER')}>`;

        await this.transporter.sendMail({
          from: mailFrom,
          to: toEmail,
          subject: `[Monett] Mã xác thực đăng ký: ${otpCode}`,
          html: htmlContent,
        });
        this.logger.log(`✅ Đã gửi email mã OTP đăng ký (${otpCode}) thành công tới: ${toEmail}`);
        return true;
      } catch (err: any) {
        this.logger.error(`❌ Gửi email qua SMTP thất bại: ${err.message}`);
      }
    }

    // Luôn ghi log rõ ràng trong console
    console.log(`\n======================================================`);
    console.log(`📨 [MONETT OTP] Gửi tới: ${toEmail}`);
    console.log(`🔑 MÃ OTP CỦA BẠN LÀ:  >>>  ${otpCode}  <<<`);
    console.log(`⏱️ Hiệu lực: 5 phút`);
    console.log(`======================================================\n`);
    return true;
  }

  async sendForgotPasswordEmail(toEmail: string, otpCode: string): Promise<boolean> {
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
        <!-- Header Xanh Ngọc Monett -->
        <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 28px 24px; text-align: center; color: #FFFFFF;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px;">Monett.</h1>
          <p style="margin: 6px 0 0 0; font-size: 13.5px; opacity: 0.95; font-weight: 500;">Khôi Phục Mật Khẩu Tài Khoản</p>
        </div>

        <!-- Body -->
        <div style="padding: 28px 24px; background-color: #FFFFFF;">
          <div style="text-align: center; margin-bottom: 20px;">
            <span style="font-size: 38px;">🔐</span>
            <h2 style="color: #0F172A; font-size: 20px; margin: 10px 0 6px 0;">Yêu Cầu Đặt Lại Mật Khẩu</h2>
            <p style="color: #64748B; font-size: 13.5px; margin: 0; line-height: 1.5;">
              Monett đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với <strong style="color: #0F172A;">${toEmail}</strong>.
            </p>
          </div>

          <!-- Khung Mã OTP Nổi Bật -->
          <div style="background-color: #ECFDF5; border: 2px dashed #10B981; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #047857; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Mã Khôi Phục Của Bạn</p>
            <div style="font-size: 32px; font-weight: 800; color: #065F46; letter-spacing: 6px; font-family: monospace;">${otpCode}</div>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #059669;">(Mã có hiệu lực trong vòng <strong>5 phút</strong>)</p>
          </div>

          <p style="color: #DC2626; font-size: 12.5px; line-height: 1.5; margin: 0 0 12px 0; text-align: center; font-weight: 600;">
            ⚠️ Không chia sẻ mã này cho bất kỳ ai. Nhân viên Monett không bao giờ hỏi mã OTP của bạn.
          </p>
          <p style="color: #94A3B8; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
            Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email hoặc đổi mật khẩu để bảo vệ tài khoản.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #F1F5F9; padding: 14px 20px; text-align: center; border-top: 1px solid #E2E8F0;">
          <p style="margin: 0; font-size: 11.5px; color: #64748B;">© 2026 Monett Finance Moments. All rights reserved.</p>
        </div>
      </div>
    `;

    if (this.transporter) {
      try {
        const mailFrom =
          this.configService.get<string>('MAIL_FROM') ||
          `"Monett Finance" <${this.configService.get<string>('MAIL_USER')}>`;

        await this.transporter.sendMail({
          from: mailFrom,
          to: toEmail,
          subject: `[Monett] Mã đặt lại mật khẩu: ${otpCode}`,
          html: htmlContent,
        });
        this.logger.log(`✅ Đã gửi email mã OTP đặt lại mật khẩu (${otpCode}) thành công tới: ${toEmail}`);
        return true;
      } catch (err: any) {
        this.logger.error(`❌ Gửi email khôi phục mật khẩu qua SMTP thất bại: ${err.message}`);
      }
    }

    console.log(`\n======================================================`);
    console.log(`📨 [MONETT RESET PASSWORD OTP] Gửi tới: ${toEmail}`);
    console.log(`🔑 MÃ OTP CỦA BẠN LÀ:  >>>  ${otpCode}  <<<`);
    console.log(`⏱️ Hiệu lực: 5 phút`);
    console.log(`======================================================\n`);
    return true;
  }
}
