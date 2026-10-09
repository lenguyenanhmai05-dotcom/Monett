import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RecurringBillDocument = RecurringBill & Document;

@Schema({ timestamps: true })
export class RecurringBill {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, default: 0 })
  amount: number;

  @Prop({ required: true, default: 1 })
  dueDay: number; // Ngày trong tháng (1 - 31)

  @Prop({ default: 3 })
  remindBeforeDays: number; // 1, 3, 5, 7 ngày

  @Prop({ default: false })
  isPaidThisMonth: boolean;

  @Prop({ default: '' })
  lastPaidMonth: string; // YYYY-MM

  @Prop({ default: 'Hóa đơn', trim: true })
  category: string;

  @Prop({ default: '', trim: true })
  note: string;
}

export const RecurringBillSchema = SchemaFactory.createForClass(RecurringBill);

RecurringBillSchema.set('toJSON', {
  transform: (doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
