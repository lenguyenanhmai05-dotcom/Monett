import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  RecurringBill,
  RecurringBillSchema,
} from './schemas/recurring-bill.schema';
import { Debt, DebtSchema } from './schemas/debt.schema';
import { BillsAndDebtsService } from './bills-and-debts.service';
import { BillsAndDebtsController } from './bills-and-debts.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RecurringBill.name, schema: RecurringBillSchema },
      { name: Debt.name, schema: DebtSchema },
    ]),
  ],
  controllers: [BillsAndDebtsController],
  providers: [BillsAndDebtsService],
  exports: [BillsAndDebtsService],
})
export class BillsAndDebtsModule {}
