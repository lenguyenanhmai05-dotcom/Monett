import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReminderDocument = Reminder & Document;

@Schema({ timestamps: true })
export class Reminder {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, default: '' })
  date: string; // YYYY-MM-DD

  @Prop({ required: true, default: '12:00' })
  time: string; // HH:mm

  @Prop({ default: 10 })
  remindBeforeMinutes: number; // Phút báo trước (5, 10, 15...)

  @Prop({ default: false, index: true })
  isCompleted: boolean;

  @Prop({ default: false })
  isDismissed: boolean;

  @Prop({ default: '', trim: true })
  note: string;
}

export const ReminderSchema = SchemaFactory.createForClass(Reminder);

ReminderSchema.set('toJSON', {
  transform: (doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
