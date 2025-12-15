/**
 * 创建测试用户脚本
 * 在数据库中创建测试用户
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../src/database/entities/user.entity';
import * as bcrypt from 'bcrypt';

async function createTestUser() {
  // 创建数据库连接
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'ue_assets',
    entities: [User],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ 数据库连接成功');

    const userRepository = dataSource.getRepository(User);

    // 创建测试用户列表
    const testUsers = [
      {
        email: 'test@factory-buy.com',
        password: 'password123',
        name: '测试用户',
      },
      {
        email: 'admin@admin.local',
        password: 'admin123',
        name: '管理员',
      },
    ];

    for (const testUser of testUsers) {
      // 检查用户是否已存在
      const existingUser = await userRepository.findOne({
        where: { email: testUser.email },
      });

      if (existingUser) {
        console.log(`⚠️  用户 ${testUser.email} 已存在，跳过创建`);
        continue;
      }

      // 加密密码
      const passwordHash = await bcrypt.hash(testUser.password, 10);

      // 创建用户
      const user = userRepository.create({
        id: testUser.email, // 使用邮箱作为 ID
        email: testUser.email,
        name: testUser.name,
        passwordHash,
        credits: parseInt(process.env.INITIAL_CREDITS || '100', 10),
        billingMode: 'DRY_RUN',
        modelMode: 'DRY_RUN',
      });

      await userRepository.save(user);
      console.log(`✅ 用户 ${testUser.email} 创建成功`);
      console.log(`   密码: ${testUser.password}`);
      console.log(`   初始积分: ${user.credits}`);
    }

    console.log('\n✅ 所有测试用户创建完成！');
    console.log('\n可用账号：');
    console.log('1. test@factory-buy.com / password123');
    console.log('2. admin@admin.local / admin123');
  } catch (error) {
    console.error('❌ 创建用户失败:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

createTestUser();


