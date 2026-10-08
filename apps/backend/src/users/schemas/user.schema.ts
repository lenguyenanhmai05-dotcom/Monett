import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '@monett/shared';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: false })
  password?: string;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ default: null })
  avatarUrl?: string;

  @Prop({ default: 'VND' })
  currency: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ default: null, sparse: true })
  googleId?: string;

  @Prop({ default: 'local' })
  authProvider: string;

  @Prop({ default: 'light' })
  theme: string;

  @Prop({ default: 0 })
  streak: number;

  @Prop({ default: '' })
  lastActiveDate: string;

  // Tổng số ngày đã hoạt động (không bao giờ reset, kể cả khi mất chuỗi)
  @Prop({ default: 0 })
  totalActiveDays: number;

  // Kỷ lục chuỗi dài nhất từng đạt được
  @Prop({ default: 0 })
  longestStreak: number;

  // Ngày (YYYY-MM-DD, giờ VN) lá chắn streak được dùng gần nhất.
  // Mỗi tuần (bắt đầu Thứ 2) có 1 lá chắn, tự động dùng khi lỡ đúng 1 ngày.
  @Prop({ default: '' })
  shieldUsedDate: string;

  @Prop({ default: null })
  reminderTime?: string;

  @Prop({ default: false })
  isPro: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Tự động ẩn password khi convert sang JSON
UserSchema.set('toJSON', {
  transform: (doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  },
});
