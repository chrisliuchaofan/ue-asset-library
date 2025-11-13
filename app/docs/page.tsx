import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  Filter, 
  ShoppingCart, 
  Upload, 
  Edit, 
  Trash2, 
  Settings,
  FileImage,
  Video,
  Tag,
  Type,
  Layers,
  Home,
  Copy,
  Eye
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
        {/* 首页介绍 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              首页介绍
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">欢迎页面</h3>
              <p className="text-sm text-muted-foreground mb-2">
                首页采用现代化的设计，包含动态星系背景和优雅的动画效果：
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>标题「恒星资产库」具有淡入缩放动画和微妙的星光渐变效果</li>
                <li>「资产」和「素材」按钮采用玻璃拟态风格，hover 时有流畅的交互反馈</li>
                <li>「使用手册」链接 hover 时会有下划线展开动画</li>
                <li>点击「资产」或「素材」按钮即可进入对应的浏览页面</li>
              </ul>
            </div>
          </CardContent>
        </Card>

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
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Search className="h-4 w-4" />
                搜索功能
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                在页面顶部搜索框输入关键词，可以实时搜索资产名称。支持关键词高亮显示，输入后自动筛选结果。
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                筛选功能
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                左侧筛选栏支持按以下条件筛选（可多选）：
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li><strong>类型</strong>：角色、场景、动画、特效、材质、蓝图、UI、合成、音频、其他</li>
                <li><strong>风格</strong>：写实、二次元、卡通、国风等</li>
                <li><strong>标签</strong>：可多选，如自然、风景、建筑等</li>
                <li><strong>来源</strong>：内部、外部、网络</li>
                <li><strong>引擎版本</strong>：UE5.6、UE5.5、UE4.3等</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                每个筛选项会显示匹配的资产数量，点击「清除筛选」可重置所有筛选条件。
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                预览功能
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                资产卡片提供多种预览方式：
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>点击资产卡片可以打开详情弹窗，查看完整信息和媒体画廊</li>
                <li>媒体画廊支持图片放大和视频播放控制</li>
                <li>可以浏览资产的所有预览图和视频</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                我的清单
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                可以将资产添加到"我的清单"中，方便批量管理：
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>点击资产卡片上的「清单」按钮（购物车图标）添加到清单</li>
                <li>点击导航栏的购物车图标查看清单</li>
                <li>在清单中可以移除单个资产或清空整个清单</li>
                <li>支持批量导出为 CSV 文件，包含资产的关键信息</li>
                <li>清单数据保存在浏览器本地存储中，刷新页面不会丢失</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Copy className="h-4 w-4" />
                NAS 路径
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                每个资产都有广州和深圳的 NAS 路径：
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>点击资产卡片上的「NAS」按钮可以复制对应办公地的 NAS 路径</li>
                <li>如果资产未填写 NAS 路径，会提示"未填写"</li>
                <li>复制后可直接在文件管理器中访问资产文件</li>
              </ul>
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
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                筛选功能
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                左侧筛选栏支持按以下条件筛选：
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li><strong>类型</strong>：UE视频、AE视频、混剪、AI视频、图片（单选）</li>
                <li><strong>标签</strong>：爆款、优质、达标（单选）</li>
                <li><strong>质量</strong>：高品质、常规、迭代（多选）</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                类型和标签为单选，质量可多选。点击「清除筛选」可重置所有筛选条件。
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">素材卡片</h3>
              <p className="text-sm text-muted-foreground mb-2">
                每个素材卡片显示以下信息：
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>预览图或视频缩略图</li>
                <li>类型标签（UE视频、AE视频等）</li>
                <li>质量标签（爆款、优质、达标）</li>
                <li>质量等级（高品质、常规、迭代）</li>
                <li>文件大小和时长（如果是视频）</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                预览功能
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                素材预览功能：
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>点击素材卡片可以打开详情弹窗</li>
                <li>支持图片放大和视频播放控制</li>
                <li>可以查看素材的完整信息</li>
              </ul>
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
                    <li><strong>单个上传</strong>：点击上传区域选择文件，支持图片和视频格式</li>
                    <li><strong>批量上传</strong>：选择多个文件或使用批量上传对话框，可一次性上传多个资产</li>
                    <li><strong>拖拽上传</strong>：直接拖拽文件到上传区域，支持多文件拖拽</li>
                    <li>上传后系统会自动填充文件信息（大小、尺寸、时长等）</li>
                    <li>需要手动填写资产名称、类型、风格、标签等必要信息</li>
                    <li>可以设置预览图（点击已上传文件列表中的星标图标）</li>
                    <li>填写完成后点击「创建资产」保存</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    编辑资产
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-6">
                    <li>在资产列表中找到目标资产，点击「修改」按钮</li>
                    <li>可以修改资产的所有信息：名称、类型、风格、标签、来源、引擎版本等</li>
                    <li>可以添加更多预览图/视频到媒体画廊</li>
                    <li>可以修改或删除现有的预览文件</li>
                    <li>可以更新广州和深圳的 NAS 路径</li>
                    <li>修改完成后点击「更新资产」保存更改</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    删除资产
                  </h4>
                  <p className="text-sm text-muted-foreground ml-6">
                    在资产列表中点击「删除」按钮，系统会要求确认操作。删除后资产及其关联文件将被移除，此操作不可恢复，请谨慎操作。
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    标签和类型管理
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-6">
                    <li>点击「标签管理」或「类型管理」按钮打开管理对话框</li>
                    <li><strong>查看使用情况</strong>：每个标签/类型会显示使用该标签/类型的资产数量</li>
                    <li><strong>重命名</strong>：可以重命名标签或类型，系统会自动更新所有使用该标签/类型的资产</li>
                    <li><strong>删除</strong>：可以删除标签或类型，删除后相关资产会自动移除该标签/类型</li>
                    <li><strong>添加</strong>：可以添加新的标签或类型，添加后即可在创建/编辑资产时使用</li>
                    <li>支持批量管理，提高工作效率</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    批量操作
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-6">
                    <li>在资产列表中勾选多个资产（使用复选框）</li>
                    <li>勾选后会出现「批量操作」按钮</li>
                    <li>支持批量添加标签，为多个资产同时添加相同标签</li>
                    <li>支持批量编辑其他属性，如类型、风格、来源等</li>
                    <li>批量操作可以大大提高管理效率</li>
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
                    <li><strong>多文件上传</strong>：选择多个文件后，每个文件会自动创建一个素材条目</li>
                    <li>上传的文件会自动填充基本信息（文件大小、尺寸、时长等）</li>
                    <li>需要手动选择类型（UE视频、AE视频、混剪、AI视频、图片）</li>
                    <li>需要手动选择标签（爆款、优质、达标）和质量（高品质、常规、迭代）</li>
                    <li>支持拖拽上传，可一次性拖拽多个文件</li>
                    <li>可以设置预览图（点击已上传文件列表中的星标图标）</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    编辑素材
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-6">
                    <li>在素材列表中找到目标素材，点击「修改」按钮</li>
                    <li>可以修改素材的类型、标签、质量等信息</li>
                    <li>可以添加更多文件到媒体画廊</li>
                    <li>可以修改或删除现有的预览文件</li>
                    <li>修改完成后点击「更新素材」保存更改</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <Trash2 className="h-4 w-4" />
                    删除素材
                  </h4>
                  <p className="text-sm text-muted-foreground ml-6">
                    在素材列表中点击「删除」按钮，系统会要求确认操作。删除后素材及其关联文件将被移除，此操作不可恢复，请谨慎操作。
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    标签和类型管理
                  </h4>
                  <p className="text-sm text-muted-foreground ml-6">
                    素材的标签和类型是固定的枚举值，不能添加、删除或重命名。可以在管理对话框中查看每个标签/类型的使用情况（使用该标签/类型的素材数量）。
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Search className="h-4 w-4" />
                搜索和筛选
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                管理后台支持搜索和筛选功能，方便快速找到需要管理的资产或素材：
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>使用搜索框按名称实时搜索，支持关键词匹配</li>
                <li>使用下拉菜单按类型或标签筛选，快速定位目标内容</li>
                <li>默认显示前5条，可以点击「显示更多」查看全部结果</li>
                <li>搜索结果会实时更新，无需手动刷新</li>
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
                A: 将资产添加到"我的清单"后，点击导航栏的购物车图标打开清单弹窗，点击「导出」按钮即可将清单中的所有资产信息导出为 CSV 文件。导出的文件包含资产名称、类型、风格、引擎版本、来源、NAS 路径、创建时间、更新时间、预览图 URL 等关键信息。
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Q: 上传的文件大小有限制吗？</h3>
              <p className="text-sm text-muted-foreground">
                A: 文件大小限制取决于服务器配置和存储模式。建议单个文件不超过 100MB，以确保上传速度和稳定性。如果遇到上传失败，请检查文件大小和格式是否符合要求。
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Q: 支持哪些文件格式？</h3>
              <p className="text-sm text-muted-foreground">
                A: 系统支持常见的图片格式（JPG、PNG、GIF、WebP 等）和视频格式（MP4、WebM、MOV、AVI、MKV 等）。上传时会自动识别文件类型并显示相应的预览。
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Q: 如何修改资产或素材的预览图？</h3>
              <p className="text-sm text-muted-foreground">
                A: 在管理后台编辑资产/素材时，上传新文件后，在已上传文件列表中点击星标图标（⭐）可以将其设置为预览图。预览图会显示在资产/素材卡片上，作为主要展示图片。
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Q: 清单数据会丢失吗？</h3>
              <p className="text-sm text-muted-foreground">
                A: 不会。清单数据保存在浏览器的本地存储（LocalStorage）中，即使刷新页面、关闭浏览器或重启电脑也不会丢失。只有在清除浏览器数据或使用隐私模式时才会丢失。建议定期导出清单作为备份。
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Q: 如何复制 NAS 路径？</h3>
              <p className="text-sm text-muted-foreground">
                A: 在资产卡片上点击「NAS」按钮，系统会自动复制对应办公地（广州或深圳）的 NAS 路径到剪贴板。如果资产未填写 NAS 路径，按钮会显示"未填写"且无法复制。复制后可以在文件管理器的地址栏中粘贴并访问。
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Q: 筛选条件可以组合使用吗？</h3>
              <p className="text-sm text-muted-foreground">
                A: 可以。所有筛选条件都可以同时使用，系统会显示同时满足所有筛选条件的资产/素材。例如，可以同时筛选"类型=角色"、"风格=写实"和"标签=自然"的资产。点击「清除筛选」可以重置所有筛选条件。
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Q: 如何批量管理资产？</h3>
              <p className="text-sm text-muted-foreground">
                A: 在管理后台的资产列表中，勾选多个资产后会出现「批量操作」按钮。点击后可以批量添加标签、修改类型、风格等属性，大大提高管理效率。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 提示 */}
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>提示：</strong>如有其他问题或建议，请联系系统管理员。
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>注意：</strong>删除操作不可恢复，请谨慎操作。建议在删除前先确认资产/素材不再需要。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

