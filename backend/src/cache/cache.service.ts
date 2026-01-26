import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

// TTL en segundos
export const CACHE_TTL = {
  FESTIVALS: 3600, // 1 hora - cambian poco
  EXPERIENCES_LIST: 300, // 5 minutos
  EXPERIENCE_DETAIL: 300, // 5 minutos
  USER_PROFILE: 300, // 5 minutos
  STATS: 600, // 10 minutos
  TOP_EXPERIENCES: 600, // 10 minutos
  TOP_HOSTS: 600, // 10 minutos
};

// Prefijos de cache keys
export const CACHE_KEYS = {
  FESTIVALS_ALL: 'festivals:all',
  FESTIVAL: (id: string) => `festival:${id}`,
  EXPERIENCES_LIST: (page: number, filters: string) =>
    `experiences:list:${page}:${filters}`,
  EXPERIENCE: (id: string) => `experience:${id}`,
  USER_PROFILE: (id: string) => `user:profile:${id}`,
  USER_PUBLIC: (id: string) => `user:public:${id}`,
  STATS_DASHBOARD: 'stats:dashboard',
  TOP_EXPERIENCES: 'top:experiences',
  TOP_HOSTS: 'top:hosts',
};

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Obtiene un valor del cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return undefined;
    }
  }

  /**
   * Guarda un valor en el cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Elimina un valor del cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      console.error(`Cache del error for key ${key}:`, error);
    }
  }

  /**
   * Elimina multiples claves por patron
   * Nota: Para patrones, necesitamos Redis. En memoria no soporta patrones.
   */
  async delByPattern(pattern: string): Promise<void> {
    try {
      // Intentar con el store de Redis si está disponible
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const stores: any[] | undefined = (this.cacheManager as any).stores;
      if (stores && stores[0]) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const store = stores[0];
        // Redis store tiene método keys
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (store.opts?.store?.keys) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          const redisClient = store.opts.store;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          const keys: string[] = await redisClient.keys(pattern);
          if (keys.length > 0) {
            await Promise.all(keys.map((key) => this.cacheManager.del(key)));
          }
        }
      }
    } catch (error) {
      console.error(`Cache delByPattern error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Limpia todo el cache
   */
  async reset(): Promise<void> {
    try {
      // cache-manager v5+ usa clear() en lugar de reset()
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if ((this.cacheManager as any).clear) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await (this.cacheManager as any).clear();
      }
    } catch (error) {
      console.error('Cache reset error:', error);
    }
  }

  /**
   * Wrapper para cachear el resultado de una funcion
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined && cached !== null) {
      return cached;
    }

    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }

  // ============================================
  // Metodos de invalidacion especificos
  // ============================================

  /**
   * Invalida cache de festivales
   */
  async invalidateFestivals(): Promise<void> {
    await this.del(CACHE_KEYS.FESTIVALS_ALL);
    await this.delByPattern('festival:*');
  }

  /**
   * Invalida cache de un festival especifico
   */
  async invalidateFestival(festivalId: string): Promise<void> {
    await this.del(CACHE_KEYS.FESTIVALS_ALL);
    await this.del(CACHE_KEYS.FESTIVAL(festivalId));
  }

  /**
   * Invalida cache de experiencias
   */
  async invalidateExperiences(): Promise<void> {
    await this.delByPattern('experiences:*');
    await this.delByPattern('experience:*');
    await this.del(CACHE_KEYS.TOP_EXPERIENCES);
  }

  /**
   * Invalida cache de una experiencia especifica
   */
  async invalidateExperience(experienceId: string): Promise<void> {
    await this.del(CACHE_KEYS.EXPERIENCE(experienceId));
    await this.delByPattern('experiences:list:*');
    await this.del(CACHE_KEYS.TOP_EXPERIENCES);
  }

  /**
   * Invalida cache de un usuario
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.del(CACHE_KEYS.USER_PROFILE(userId));
    await this.del(CACHE_KEYS.USER_PUBLIC(userId));
    await this.del(CACHE_KEYS.TOP_HOSTS);
  }

  /**
   * Invalida cache de estadisticas
   */
  async invalidateStats(): Promise<void> {
    await this.del(CACHE_KEYS.STATS_DASHBOARD);
    await this.del(CACHE_KEYS.TOP_EXPERIENCES);
    await this.del(CACHE_KEYS.TOP_HOSTS);
  }
}
