/**
 * One-off script: Migrate materials from OSS to Supabase
 * Usage: npx tsx scripts/migrate-materials.ts
 */
import { getOSSClient } from '../lib/storage';
import { MaterialsManifestSchema, MaterialSchema } from '../data/material.schema';
import { dbBatchInsertMaterials, isMaterialsTableAvailable } from '../lib/materials-db';
import type { Material } from '../data/material.schema';

async function migrate() {
  // 1. Check table
  const available = await isMaterialsTableAvailable();
  console.log('Table available:', available);
  if (!available) {
    console.error('Table not available, aborting.');
    process.exit(1);
  }

  // 2. Read from OSS
  const client = getOSSClient();
  const result = await client.get('materials.json');
  const raw = JSON.parse(result.content.toString('utf-8'));

  // 3. Parse & validate
  let materials: Material[];
  try {
    if (raw?.materials) {
      raw.materials = raw.materials.map((m: any) =>
        m.project ? m : { ...m, project: '项目A' }
      );
    }
    const validated = MaterialsManifestSchema.parse(raw);
    materials = validated.materials;
  } catch {
    materials = (raw?.materials || [])
      .map((m: any) => (m.project ? m : { ...m, project: '项目A' }))
      .filter((m: any) => {
        try {
          MaterialSchema.parse(m);
          return true;
        } catch {
          return false;
        }
      });
  }
  console.log('Parsed materials:', materials.length);

  // 4. Insert to Supabase
  const count = await dbBatchInsertMaterials(materials);
  console.log(`Migrated: ${count} of ${materials.length}`);
}

migrate().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
