import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DebtDocument = Debt & Document;

@Schema({ timestamps: true })
export class Debt {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ required: true, enum: ['lend', 'borrow'], index: true })
  type: 'lend' | 'borrow'; // 'lend': Đang cho mượn, 'borrow': Đang đi vay

  @Prop({ required: true, trim: true })
  personName: string;

  @Prop({ required: true, default: 0 })
  amount: number;

  @Prop({ default: '' })
  dueDate: string; // YYYY-MM-DD

  @Prop({ default: false, index: true })
  isSettled: boolean;

  @Prop({ default: '', trim: true })
  note: string;
}

export const DebtSchema = SchemaFactory.createForClass(Debt);

DebtSchema.set('toJSON', {
  transform: (doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
