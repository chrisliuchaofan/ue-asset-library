import { NextResponse } from 'next/server';
import { getAllowedTypes, updateAllowedTypes, listAssets, updateAsset } from '@/lib/storage';

// 获取允许的类型列表
export async function GET() {
  try {
    const allowedTypes = await getAllowedTypes();
    return NextResponse.json({ allowedTypes });
  } catch (error) {
    console.error('获取类型列表失败', error);
    const message = error instanceof Error ? error.message : '获取类型列表失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}

// 更新类型列表（支持添加、重命名、删除）
export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { typeMappings, newTypes } = json as {
      typeMappings?: Array<{ oldType: string; newType: string | null }>;
      newTypes?: string[];
    };

    // 获取当前允许的类型列表
    let currentTypes = await getAllowedTypes();
    const assets = await listAssets();

    // 处理类型重命名和删除
    if (typeMappings && typeMappings.length > 0) {
      for (const mapping of typeMappings) {
        const { oldType, newType } = mapping;

        if (newType === null) {
          // 删除类型：将使用该类型的资产改为"其他"
          const affectedAssets = assets.filter((asset) => asset.type === oldType);
          for (const asset of affectedAssets) {
            await updateAsset(asset.id, { id: asset.id, type: '其他' });
          }

          // 从类型列表中移除
          currentTypes = currentTypes.filter((t) => t !== oldType);
        } else if (newType !== oldType) {
          // 重命名类型：更新所有使用该类型的资产
          const affectedAssets = assets.filter((asset) => asset.type === oldType);
          for (const asset of affectedAssets) {
            await updateAsset(asset.id, { id: asset.id, type: newType as any });
          }

          // 更新类型列表
          const index = currentTypes.indexOf(oldType);
          if (index !== -1) {
            currentTypes[index] = newType;
          }
        }
      }
    }

    // 添加新类型
    if (newTypes && newTypes.length > 0) {
      for (const newType of newTypes) {
        if (!currentTypes.includes(newType)) {
          currentTypes.push(newType);
        }
      }
    }

    // 确保"其他"类型始终存在
    if (!currentTypes.includes('其他')) {
      currentTypes.push('其他');
    }

    // 更新类型列表
    await updateAllowedTypes(currentTypes);

    return NextResponse.json({
      message: '类型更新成功',
      allowedTypes: currentTypes,
    });
  } catch (error) {
    console.error('更新类型失败', error);
    const message = error instanceof Error ? error.message : '更新类型失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}

