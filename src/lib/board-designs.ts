import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { parseConfig } from '@/lib/board-designer/serialize';
import type { BoardDesignConfig } from '@/lib/board-designer/types';
import type { Prisma } from '@prisma/client';

export interface BoardDesignSummary {
  id: string;
  name: string;
  /** Raw JSON — library thumbnails parse per-row without throwing the page. */
  config: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}

export interface BoardDesignRecord {
  id: string;
  name: string;
  config: BoardDesignConfig;
  createdAt: Date;
  updatedAt: Date;
}

function validateConfig(config: BoardDesignConfig): BoardDesignConfig {
  const parsed = parseConfig(config);
  if (!parsed.ok) {
    throw new Error('Invalid board design config');
  }
  return parsed.config;
}

function toInputJson(config: BoardDesignConfig): Prisma.InputJsonValue {
  return config as unknown as Prisma.InputJsonValue;
}

function readStoredConfig(config: Prisma.JsonValue): BoardDesignConfig {
  const parsed = parseConfig(config);
  if (!parsed.ok) {
    throw new Error('Stored board design config is invalid');
  }
  return parsed.config;
}

export async function listDesigns(): Promise<BoardDesignSummary[]> {
  const user = await requireUser();

  return prisma.boardDesign.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      config: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getDesign(id: string): Promise<BoardDesignRecord | null> {
  const user = await requireUser();

  const row = await prisma.boardDesign.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      name: true,
      config: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!row) return null;

  return {
    ...row,
    config: readStoredConfig(row.config),
  };
}

export async function createDesign(config: BoardDesignConfig): Promise<BoardDesignRecord> {
  const user = await requireUser();
  const validated = validateConfig(config);

  const row = await prisma.boardDesign.create({
    data: {
      userId: user.id,
      name: validated.name,
      config: toInputJson(validated),
    },
    select: {
      id: true,
      name: true,
      config: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return {
    ...row,
    config: readStoredConfig(row.config),
  };
}

export async function updateDesign(id: string, config: BoardDesignConfig): Promise<void> {
  const user = await requireUser();
  const validated = validateConfig(config);

  await prisma.boardDesign.updateMany({
    where: { id, userId: user.id },
    data: {
      name: validated.name,
      config: toInputJson(validated),
    },
  });
}

export async function deleteDesign(id: string): Promise<void> {
  const user = await requireUser();

  await prisma.boardDesign.deleteMany({
    where: { id, userId: user.id },
  });
}
