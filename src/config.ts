import captainImage from '../hero-captain.png';
import fruitImage from '../hero-fruit.png';
import sproutImage from '../hero-sprout.png';
import steamImage from '../hero-steam.png';
import type { HeroConfig } from './types';

export const GRID_SIZE = 4;
export const STORAGE_KEY = 'hidong-2048-save';
export const HERO_TARGET_OPTIONS = [128, 256, 512] as const;
export const DEFAULT_HERO_TARGET = 128;

export const HEROES: HeroConfig[] = [
  {
    id: 'steam',
    name: '蒸汽博士',
    title: '嗨咚蒸汽豆',
    description: '厚积薄发，先声夺人的蒸汽先锋。',
    image: steamImage,
    themeClass: 'hero-steam',
    targetValue: DEFAULT_HERO_TARGET,
    accent: '#4ec9ff',
  },
  {
    id: 'fruit',
    name: '果美美',
    title: '嗨咚果果豆',
    description: '能量饱满，像果汁一样炸裂。',
    image: fruitImage,
    themeClass: 'hero-fruit',
    targetValue: DEFAULT_HERO_TARGET,
    accent: '#ff8a65',
  },
  {
    id: 'sprout',
    name: '绿芽仔',
    title: '嗨咚芽芽豆',
    description: '从一点微光里长成奇迹。',
    image: sproutImage,
    themeClass: 'hero-sprout',
    targetValue: DEFAULT_HERO_TARGET,
    accent: '#7cd992',
  },
  {
    id: 'captain',
    name: '浪浪船长',
    title: '嗨咚船长豆',
    description: '统筹全局的终极收集目标。',
    image: captainImage,
    themeClass: 'hero-captain',
    targetValue: DEFAULT_HERO_TARGET,
    accent: '#ffd166',
  },
];

export function createDefaultHeroTargetOverrides(): Record<string, number> {
  return Object.fromEntries(HEROES.map((hero) => [hero.id, hero.targetValue]));
}

export function withHeroTargets(overrides: Record<string, number>): HeroConfig[] {
  return HEROES.map((hero) => ({
    ...hero,
    targetValue: overrides[hero.id] ?? hero.targetValue,
  }));
}
