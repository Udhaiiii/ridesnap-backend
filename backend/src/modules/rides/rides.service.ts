import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RidesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const rides = await this.prisma.ride.findMany({ orderBy: { id: 'asc' } });
    return { success: true, rides };
  }

  async create(id: string, name: string, emoji?: string) {
    const rideId = id.trim().toUpperCase();
    const exists = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (exists) throw new ConflictException({ success: false, error: `Ride ${rideId} already exists` });

    const ride = await this.prisma.ride.create({
      data: { id: rideId, name: name.trim(), emoji: emoji ?? '🎢' },
    });
    return { success: true, ride };
  }

  async update(id: string, name: string, emoji?: string) {
    const rideId = id.trim().toUpperCase();
    const exists = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!exists) throw new NotFoundException({ success: false, error: `Ride ${rideId} not found` });

    await this.prisma.ride.update({
      where: { id: rideId },
      data: { name: name.trim(), emoji: emoji ?? '🎢' },
    });
    await this.prisma.photo.updateMany({
      where: { rideId },
      data: { rideName: name.trim() },
    });
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    return { success: true, ride };
  }

  async remove(id: string) {
    const rideId = id.trim().toUpperCase();
    const exists = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!exists) throw new NotFoundException({ success: false, error: `Ride ${rideId} not found` });
    await this.prisma.ride.delete({ where: { id: rideId } });
    return { success: true, message: `Ride ${rideId} deleted` };
  }
}
