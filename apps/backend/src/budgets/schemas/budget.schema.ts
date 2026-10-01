import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BudgetDocument = Budget & Document;

@Schema({ timestamps: true })
export class Budget {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ required: true })
  month: number; // 1 - 12

  @Prop({ required: true })
  year: number;

  @Prop({ required: true, default: 20000000 })
  limit: number; // Hạn mức chi tiêu tháng (VND)

  @Prop({ default: 'VND' })
  currency: string;

  @Prop({ default: 5 })
  payday: number; // Ngày trả lương định kỳ (1-31)
}

export const BudgetSchema = SchemaFactory.createForClass(Budget);

BudgetSchema.index({ user: 1, month: 1, year: 1 }, { unique: true });

BudgetSchema.set('toJSON', {
  transform: (doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
