import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalUsers,
      verifiedUsers,
      totalExperiences,
      publishedExperiences,
      totalMatches,
      acceptedMatches,
      completedMatches,
      totalReviews,
      recentUsers,
      recentExperiences,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { verified: true } }),
      this.prisma.experience.count(),
      this.prisma.experience.count({ where: { published: true } }),
      this.prisma.match.count(),
      this.prisma.match.count({ where: { status: 'accepted' } }),
      this.prisma.match.count({ where: { status: 'completed' } }),
      this.prisma.review.count(),
      this.prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          verified: true,
        },
      }),
      this.prisma.experience.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          city: true,
          published: true,
          createdAt: true,
          host: { select: { name: true } },
        },
      }),
    ]);

    // Revenue stats
    const transactions = await this.prisma.transaction.aggregate({
      where: { status: 'completed' },
      _sum: { amount: true },
    });

    return {
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        unverified: totalUsers - verifiedUsers,
      },
      experiences: {
        total: totalExperiences,
        published: publishedExperiences,
        drafts: totalExperiences - publishedExperiences,
      },
      matches: {
        total: totalMatches,
        accepted: acceptedMatches,
        completed: completedMatches,
      },
      reviews: totalReviews,
      revenue: transactions._sum.amount || 0,
      recentUsers,
      recentExperiences,
    };
  }

  async getUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          verified: true,
          city: true,
          createdAt: true,
          _count: {
            select: {
              experiences: true,
              matchesAsHost: true,
              matchesAsRequester: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getExperiences(
    page = 1,
    limit = 20,
    status?: 'all' | 'published' | 'draft',
  ) {
    const skip = (page - 1) * limit;

    const where =
      status === 'published'
        ? { published: true }
        : status === 'draft'
          ? { published: false }
          : {};

    const [experiences, total] = await Promise.all([
      this.prisma.experience.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          city: true,
          type: true,
          price: true,
          published: true,
          createdAt: true,
          host: { select: { id: true, name: true, email: true } },
          festival: { select: { name: true } },
          _count: {
            select: {
              matches: true,
              reviews: true,
            },
          },
        },
      }),
      this.prisma.experience.count({ where }),
    ]);

    return {
      experiences,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async toggleExperiencePublished(experienceId: string) {
    const experience = await this.prisma.experience.findUnique({
      where: { id: experienceId },
    });

    if (!experience) {
      throw new Error('Experiencia no encontrada');
    }

    return this.prisma.experience.update({
      where: { id: experienceId },
      data: { published: !experience.published },
    });
  }

  async setUserRole(userId: string, role: 'user' | 'admin') {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  }

  async deleteUser(userId: string) {
    // This will cascade delete related records based on schema
    return this.prisma.user.delete({
      where: { id: userId },
    });
  }

  async deleteExperience(experienceId: string) {
    return this.prisma.experience.delete({
      where: { id: experienceId },
    });
  }
}
