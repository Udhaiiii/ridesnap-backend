import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { todayLocal, parseWristbandNumber } from '../../common/utils/date.util';

@Injectable()
export class WristbandsService {
  constructor(private readonly prisma: PrismaService) {}

  async todayStatus() {
    const today = todayLocal();
    const todayWBs = await this.prisma.wristband.findMany({
      where: { batchDate: today },
      orderBy: { createdAt: 'asc' },
    });

    if (todayWBs.length === 0) {
      return {
        success: true,
        today,
        total_today: 0,
        next_from: 1,
        last_number: 0,
        batches_today: [],
        message: 'No wristbands generated today. Start from 1.',
      };
    }

    let maxNum = 0;
    const batchGroups: Record<string, { label: string; count: number; from: string; to: string }> = {};

    for (const wb of todayWBs) {
      const num = parseWristbandNumber(wb.id);
      if (num > maxNum) maxNum = num;
      const label = wb.batchLabel ?? 'Batch';
      if (!batchGroups[label]) {
        batchGroups[label] = { label, count: 0, from: wb.id, to: wb.id };
      }
      batchGroups[label].count++;
      batchGroups[label].to = wb.id;
    }

    return {
      success: true,
      today,
      total_today: todayWBs.length,
      next_from: maxNum + 1,
      last_number: maxNum,
      batches_today: Object.values(batchGroups),
      message: `Today: ${todayWBs.length} wristbands printed. Next batch starts from ${maxNum + 1}.`,
    };
  }

  async generate(quantity: number, prefix = 'WB', label?: string) {
    const today = todayLocal();
    const todayWBs = await this.prisma.wristband.findMany({
      where: { batchDate: today },
      select: { id: true },
    });

    let nextFrom = 1;
    if (todayWBs.length > 0) {
      let maxNum = 0;
      for (const wb of todayWBs) {
        const num = parseWristbandNumber(wb.id);
        if (num > maxNum) maxNum = num;
      }
      nextFrom = maxNum + 1;
    }

    const from = nextFrom;
    const to = from + quantity - 1;
    const batchLabel =
      label ?? `Batch ${today} · #${String(from).padStart(4, '0')}–#${String(to).padStart(4, '0')}`;

    const ids: string[] = [];
    for (let i = from; i <= to; i++) {
      ids.push(`${prefix}-${String(i).padStart(4, '0')}`);
    }

    const existingToday = await this.prisma.wristband.findMany({
      where: { id: { in: ids }, batchDate: today },
    });
    if (existingToday.length > 0) {
      throw new ConflictException({
        success: false,
        error: `These wristbands already exist for today: ${existingToday.map((w) => w.id).join(', ')}`,
        hint: 'Cannot generate duplicates for the same day.',
      });
    }

    await this.prisma.wristband.deleteMany({
      where: { id: { in: ids }, batchDate: { not: today } },
    });

    await this.prisma.wristband.createMany({
      data: ids.map((id) => ({
        id,
        status: 'inactive',
        batchDate: today,
        batchLabel,
      })),
    });

    return {
      success: true,
      message: `${ids.length} wristbands registered (${ids[0]} → ${ids[ids.length - 1]})`,
      from: ids[0],
      to: ids[ids.length - 1],
      from_number: from,
      to_number: to,
      count: ids.length,
      batch_label: batchLabel,
      next_from: to + 1,
    };
  }

  async validate(id: string) {
    const wbId = id.toUpperCase().trim();
    const today = todayLocal();
    const wb = await this.prisma.wristband.findUnique({ where: { id: wbId } });

    if (!wb) {
      return {
        success: true,
        valid: false,
        reason: `"${wbId}" is not registered. Only pre-printed wristbands accepted.`,
      };
    }

    if (wb.batchDate !== today) {
      return {
        success: true,
        valid: false,
        expired: true,
        reason: `Wristband "${wbId}" was from ${wb.batchDate} and has expired. Only today's wristbands are valid.`,
      };
    }

    return {
      success: true,
      valid: true,
      wristband: wb,
      status: wb.status,
      batch_label: wb.batchLabel,
    };
  }

  async list(date?: string, status?: string) {
    const wristbands = await this.prisma.wristband.findMany({
      where: {
        ...(date ? { batchDate: date } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { id: 'asc' },
    });
    const total = wristbands.length;
    const inactive = wristbands.filter((w) => w.status === 'inactive').length;
    const active = wristbands.filter((w) => w.status === 'active').length;
    const used = wristbands.filter((w) => w.status === 'used').length;
    return { success: true, wristbands, stats: { total, inactive, active, used } };
  }

  async batches() {
    const rows = await this.prisma.$queryRaw<
      Array<{
        batch_label: string;
        batch_date: string;
        count: bigint;
        first_id: string;
        last_id: string;
        inactive: bigint;
        active: bigint;
        used: bigint;
      }>
    >`
      SELECT batch_label, batch_date,
             COUNT(*)::int as count,
             MIN(id) as first_id,
             MAX(id) as last_id,
             SUM(CASE WHEN status='inactive' THEN 1 ELSE 0 END)::int as inactive,
             SUM(CASE WHEN status='active' THEN 1 ELSE 0 END)::int as active,
             SUM(CASE WHEN status='used' THEN 1 ELSE 0 END)::int as used
      FROM wristbands
      GROUP BY batch_label, batch_date
      ORDER BY batch_date DESC
    `;
    const batches = rows.map((r: (typeof rows)[number]) => ({
      batch_label: r.batch_label,
      batch_date: r.batch_date,
      count: Number(r.count),
      first_id: r.first_id,
      last_id: r.last_id,
      inactive: Number(r.inactive),
      active: Number(r.active),
      used: Number(r.used),
    }));
    return { success: true, batches };
  }
}
