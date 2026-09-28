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
