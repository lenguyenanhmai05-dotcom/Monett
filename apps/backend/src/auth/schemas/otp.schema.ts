import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OtpDocument = Otp & Document;

@Schema({ timestamps: true })
export class Otp {
  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true })
  otp: string;

  // TTL index: MongoDB tự động xóa document này khi thời gian hiện tại vượt qua expiresAt (mặc định 5 phút)
  @Prop({ required: true, expires: 0 })
  expiresAt: Date;

  @Prop({ default: false })
  verified: boolean;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);
