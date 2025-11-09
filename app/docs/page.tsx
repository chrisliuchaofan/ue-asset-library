import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  ShoppingCart, 
  Download, 
  Upload, 
  Edit, 
  Trash2, 
  Settings,
  FileImage,
  Video,
  Tag,
  Type,
  Layers
} from 'lucide-react';

export const metadata: Metadata = {
  title: '使用手册 - 恒星资产库',
  description: '恒星资产库使用指南',
};

export default function DocsPage() {
  return (
    <div className="container py-10 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">使用手册</h1>
        <p className="text-muted-foreground">
          恒星资产库使用指南，帮助您快速上手资产和素材管理
        </p>
      </div>

      <div className="space-y-8">
        {/* 浏览资产 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileImage className="h-5 w-5" />
              浏览资产
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">搜索功能</h3>
              <p className="text-sm text-muted-foreground mb-2">
                在页面顶部搜索框输入关键词，可以搜索资产名称。支持实时搜索，输入后自动筛选结果。
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">支持按资产名称搜索</span>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">筛选功能</h3>
              <p className="text-sm text-muted-foreground mb-2">
                左侧筛选栏支持按以下条件筛选：
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>类型：角色、场景、动画、特效、材质、蓝图、UI、合成、音频、其他</li>
                <li>风格：写实、二次元、卡通、国风等</li>
                <li>标签：可多选，如自然、风景、建筑等</li>
                <li>来源：内部、外部、网络</li>
                <li>引擎版本：UE5.6、UE5.5、UE4.3等</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">我的清单</h3>
              <p className="text-sm text-muted-foreground mb-2">
                可以将资产添加到"我的清单"中，方便批量管理：
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>点击资产卡片上的"清单"按钮添加到清单</li>
                <li>点击导航栏的购物车图标查看清单</li>
                <li>支持批量导出为 CSV 文件</li>
                <li>清单数据会保存在本地，刷新页面不会丢失</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">NAS 路径</h3>
              <p className="text-sm text-muted-foreground mb-2">
                每个资产都有广州和深圳的 NAS 路径：
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>点击资产卡片上的"NAS"按钮可以复制对应办公地的 NAS 路径</li>
                <li>如果资产未填写 NAS 路径，会提示"未填写"</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">预览功能</h3>
              <p className="text-sm text-muted-foreground mb-2">
                双击资产卡片的预览图可以放大查看，再次双击关闭。视频支持播放控制。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 浏览素材 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              浏览素材
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">筛选功能</h3>
              <p className="text-sm text-muted-foreground mb-2">
                左侧筛选栏支持按以下条件筛选：
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>类型：UE视频、AE视频、混剪、AI视频、图片（单选）</li>
                <li>标签：爆款、优质、达标（单选）</li>
                <li>质量：高品质、常规、迭代（多选）</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">素材卡片</h3>
              <p className="text-sm text-muted-foreground mb-2">
                每个素材卡片显示：
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>第一行：类型（UE视频、AE视频等）</li>
                <li>第二行：标签（爆款、优质、达标）</li>
                <li>第三行：质量（高品质、常规、迭代）</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">预览功能</h3>
              <p className="text-sm text-muted-foreground mb-2">
                双击素材卡片的预览图可以放大查看，再次双击关闭。视频支持播放控制。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 管理后台 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              管理后台
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">访问管理后台</h3>
              <p className="text-sm text-muted-foreground mb-2">
                点击导航栏右侧的设置图标，输入管理密码后即可进入管理后台。
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">资产管理</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    上传资产
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-6">
                    <li>支持单个文件上传：点击上传区域选择文件</li>
                    <li>支持批量上传：选择多个文件或使用批量上传对话框</li>
                    <li>支持拖拽上传：直接拖拽文件到上传区域</li>
                    <li>上传后自动填充表单，填写必要信息后创建资产</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    编辑资产
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-6">
                    <li>在资产列表中点击"修改"按钮</li>
                    <li>可以修改资产的所有信息</li>
                    <li>支持添加更多预览图/视频到画廊</li>
                    <li>修改后点击"更新资产"保存</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    删除资产
                  </h4>
                  <p className="text-sm text-muted-foreground ml-6">
                    在资产列表中点击"删除"按钮，确认后即可删除。此操作不可恢复。
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    标签和类型管理
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-6">
                    <li>点击"标签管理"按钮打开管理对话框</li>
                    <li>可以重命名标签，系统会自动更新所有使用该标签的资产</li>
                    <li>可以删除标签，删除后相关资产会移除该标签</li>
                    <li>可以添加新标签</li>
                    <li>类型管理类似，支持重命名、删除和添加新类型</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    批量操作
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-6">
                    <li>勾选多个资产后，点击"批量操作"按钮</li>
                    <li>支持批量添加标签</li>
                    <li>支持批量编辑其他属性</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">素材管理</h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    上传素材
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-6">
                    <li>支持多文件上传：选择多个文件后，每个文件会自动创建一个素材</li>
                    <li>上传的文件会自动填充基本信息，需要手动选择类型、标签和质量</li>
                    <li>支持拖拽上传</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    编辑素材
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-6">
                    <li>在素材列表中点击"修改"按钮</li>
                    <li>可以修改素材的所有信息</li>
                    <li>支持添加更多文件到画廊</li>
                    <li>修改后点击"更新素材"保存</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    删除素材
                  </h4>
                  <p className="text-sm text-muted-foreground ml-6">
                    在素材列表中点击"删除"按钮，确认后即可删除。此操作不可恢复。
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    标签和类型管理
                  </h4>
                  <p className="text-sm text-muted-foreground ml-6">
                    素材的标签和类型是固定的枚举值，不能添加、删除或重命名。可以在管理对话框中查看使用情况。
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">搜索和筛选</h3>
              <p className="text-sm text-muted-foreground mb-2">
                管理后台支持搜索和筛选功能，方便快速找到需要管理的资产或素材：
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>使用搜索框按名称搜索</li>
                <li>使用下拉菜单按类型或标签筛选</li>
                <li>默认显示前5条，可以点击"显示更多"查看全部</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 常见问题 */}
        <Card>
          <CardHeader>
            <CardTitle>常见问题</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Q: 如何批量导出资产信息？</h3>
              <p className="text-sm text-muted-foreground">
                A: 将资产添加到"我的清单"后，点击导航栏的购物车图标，在弹窗中点击"导出"按钮即可导出为 CSV 文件。
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Q: 上传的文件大小有限制吗？</h3>
              <p className="text-sm text-muted-foreground">
                A: 文件大小限制取决于服务器配置，建议单个文件不超过 100MB。如果遇到上传失败，请检查文件大小和格式。
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Q: 支持哪些文件格式？</h3>
              <p className="text-sm text-muted-foreground">
                A: 支持常见的图片格式（JPG、PNG、GIF、WebP等）和视频格式（MP4、WebM、MOV、AVI等）。
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Q: 如何修改资产或素材的预览图？</h3>
              <p className="text-sm text-muted-foreground">
                A: 在管理后台编辑资产/素材时，上传新文件后，在已上传文件列表中点击星标图标可以设置为预览图。
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Q: 清单数据会丢失吗？</h3>
              <p className="text-sm text-muted-foreground">
                A: 不会。清单数据保存在浏览器本地存储中，即使刷新页面或关闭浏览器也不会丢失。只有在清除浏览器数据时才会丢失。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 提示 */}
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              <strong>提示：</strong>如有其他问题或建议，请联系系统管理员。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

