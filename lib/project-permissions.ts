import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { PROJECTS, type Project } from '@/lib/constants';
import { getStorageMode } from '@/lib/storage';
import { getOSSClient } from '@/lib/oss-client';
import { isAdmin } from '@/lib/auth/is-admin';

const PERMISSIONS_FILE = 'project-permissions.json';
const localPermissionsPath = join(process.cwd(), 'data', PERMISSIONS_FILE);

export type ProjectPermissionRecord = {
  email: string;
  projects: Project[];
  updatedAt?: string;
};

type ProjectPermissionsPayload = {
  users: ProjectPermissionRecord[];
};

const VALID_PROJECTS = new Set<string>(PROJECTS);

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
function normalizeProjects(projects: string[]): Project[] {
  return Array.from(new Set(projects.filter((project) => VALID_PROJECTS.has(project)))) as Project[];
}

function parsePayload(raw: unknown): ProjectPermissionsPayload {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as any).users)) {
    return { users: [] };
  }

  return {
    users: (raw as any).users
      .map((record: any) => ({
        email: normalizeEmail(String(record.email || '')),
        projects: normalizeProjects(Array.isArray(record.projects) ? record.projects : []),
        updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
      }))
      .filter((record: ProjectPermissionRecord) => record.email),
  };
}

async function readLocalPermissions(): Promise<ProjectPermissionsPayload> {
  try {
    const content = await fs.readFile(localPermissionsPath, 'utf-8');
    return parsePayload(JSON.parse(content));
  } catch (error) {
    if ((error as any).code !== 'ENOENT') {
      console.warn('[ProjectPermissions] 读取本地权限失败:', error);
    }
    return { users: [] };
  }
}

async function writeLocalPermissions(payload: ProjectPermissionsPayload): Promise<void> {
  await fs.mkdir(dirname(localPermissionsPath), { recursive: true });
  await fs.writeFile(localPermissionsPath, JSON.stringify(payload, null, 2), 'utf-8');
}

async function readOssPermissions(): Promise<ProjectPermissionsPayload> {
  try {
    const result = await getOSSClient().get(PERMISSIONS_FILE);
    return parsePayload(JSON.parse(result.content.toString('utf-8')));
  } catch (error) {
    const err = error as any;
    if (err?.code !== 'NoSuchKey' && err?.status !== 404) {
      console.warn('[ProjectPermissions] 读取 OSS 权限失败:', err?.message || err);
    }
    return { users: [] };
  }
}

async function writeOssPermissions(payload: ProjectPermissionsPayload): Promise<void> {
  await getOSSClient().put(PERMISSIONS_FILE, Buffer.from(JSON.stringify(payload, null, 2), 'utf-8'), {
    contentType: 'application/json',
  });
}

export async function readProjectPermissions(): Promise<ProjectPermissionRecord[]> {
  const payload = getStorageMode() === 'oss'
    ? await readOssPermissions()
    : await readLocalPermissions();

  return payload.users;
}

export async function writeProjectPermissions(records: ProjectPermissionRecord[]): Promise<void> {
  const payload: ProjectPermissionsPayload = {
    users: records
      .map((record) => ({
        email: normalizeEmail(record.email),
        projects: normalizeProjects(record.projects),
        updatedAt: record.updatedAt,
      }))
      .filter((record) => record.email),
  };

  if (getStorageMode() === 'oss') {
    await writeOssPermissions(payload);
    return;
  }

  await writeLocalPermissions(payload);
}

export async function setUserProjectPermissions(email: string, projects: string[]): Promise<Project[]> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedProjects = normalizeProjects(projects);
  const records = await readProjectPermissions();
  const nextRecord: ProjectPermissionRecord = {
    email: normalizedEmail,
    projects: normalizedProjects,
    updatedAt: new Date().toISOString(),
  };
  const nextRecords = [
    ...records.filter((record) => normalizeEmail(record.email) !== normalizedEmail),
    nextRecord,
  ].sort((a, b) => a.email.localeCompare(b.email));

  await writeProjectPermissions(nextRecords);
  return normalizedProjects;
}

export async function getStoredProjectsForEmail(email: string): Promise<Project[]> {
  const normalizedEmail = normalizeEmail(email);
  const records = await readProjectPermissions();
  const record = records.find((item) => normalizeEmail(item.email) === normalizedEmail);
  return record?.projects ?? [];
}

export async function getAllowedProjectsForEmail(email: string): Promise<Project[]> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return [];
  }

  if (await isAdmin(normalizedEmail)) {
    return [...PROJECTS];
  }

  return getStoredProjectsForEmail(normalizedEmail);
}

export function isProjectAllowed(project: string, allowedProjects: string[]): boolean {
  return allowedProjects.includes(project);
}
