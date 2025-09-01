require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./config');

async function createAtlasData() {
  try {
    console.log('🔌 Conectando ao MongoDB Atlas...');
    console.log(`📊 URI: ${config.mongodb.uri}`);
    
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    console.log('✅ Conectado ao MongoDB Atlas com sucesso!');
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);

    // Importar modelos
    const User = require('./src/models/User');
    const System = require('./src/models/System');
    const Permission = require('./src/models/Permission');

    console.log('\n🗑️  Limpando dados existentes...');
    
    // Limpar coleções existentes
    await User.deleteMany({});
    await System.deleteMany({});
    await Permission.deleteMany({});
    
    console.log('✅ Dados antigos removidos');

    console.log('\n👥 Criando usuários...');
    
    // Criar usuários
    const user1 = await User.create({
      name: "João Silva",
      email: "joao@exemplo.com",
      isActive: true,
      deletedAt: null,
      deletedBy: null
    });

    const user2 = await User.create({
      name: "Maria Santos",
      email: "maria@exemplo.com",
      isActive: true,
      deletedAt: null,
      deletedBy: null
    });

    const user3 = await User.create({
      name: "Pedro Oliveira",
      email: "pedro@exemplo.com",
      isActive: true,
      deletedAt: null,
      deletedBy: null
    });

    console.log(`✅ ${3} usuários criados`);

    console.log('\n🖥️  Criando sistemas...');
    
    // Criar sistemas
    const system1 = await System.create({
      name: "Sistema Principal",
      description: "Sistema principal da aplicação",
      availableRoles: ["admin", "user", "read", "write"],
      isActive: true,
      deletedAt: null,
      deletedBy: null
    });

    const system2 = await System.create({
      name: "Sistema Secundário",
      description: "Sistema secundário para funcionalidades específicas",
      availableRoles: ["user", "read", "write"],
      isActive: true,
      deletedAt: null,
      deletedBy: null
    });

    const system3 = await System.create({
      name: "Sistema de Relatórios",
      description: "Sistema para geração de relatórios",
      availableRoles: ["admin", "user", "read"],
      isActive: true,
      deletedAt: null,
      deletedBy: null
    });

    console.log(`✅ ${3} sistemas criados`);

    console.log('\n🔐 Criando permissões...');
    
    // Criar permissões
    const permission1 = await Permission.create({
      user: user1._id,
      system: system1._id,
      roles: ["admin", "user"],
      isActive: true,
      deletedAt: null,
      deletedBy: null
    });

    const permission2 = await Permission.create({
      user: user2._id,
      system: system2._id,
      roles: ["user", "read"],
      isActive: true,
      deletedAt: null,
      deletedBy: null
    });

    const permission3 = await Permission.create({
      user: user3._id,
      system: system3._id,
      roles: ["admin"],
      isActive: true,
      deletedAt: null,
      deletedBy: null
    });

    const permission4 = await Permission.create({
      user: user1._id,
      system: system2._id,
      roles: ["user"],
      isActive: true,
      deletedAt: null,
      deletedBy: null
    });

    const permission5 = await Permission.create({
      user: user2._id,
      system: system1._id,
      roles: ["read"],
      isActive: true,
      deletedAt: null,
      deletedBy: null
    });

    console.log(`✅ ${5} permissões criadas`);

    console.log('\n🔍 Verificando dados criados...');
    
    // Verificar contagens
    const usersCount = await User.countDocuments();
    const systemsCount = await System.countDocuments();
    const permissionsCount = await Permission.countDocuments();
    
    console.log(`📊 Usuários: ${usersCount}`);
    console.log(`📊 Sistemas: ${systemsCount}`);
    console.log(`📊 Permissões: ${permissionsCount}`);

    // Testar Permission.findActive()
    console.log('\n🧪 Testando Permission.findActive()...');
    const activePermissions = await Permission.findActive()
      .populate("user", "name email")
      .populate("system", "name")
      .select("-__v");

    console.log(`📊 Permissões ativas encontradas: ${activePermissions.length}`);
    
    if (activePermissions.length > 0) {
      activePermissions.forEach((perm, index) => {
        console.log(`  ${index + 1}. ${perm.user?.name} → ${perm.system?.name} (${perm.roles.join(', ')})`);
      });
    }

    console.log('\n🎉 DADOS CRIADOS NO ATLAS COM SUCESSO!');
    console.log('✅ Agora a API deve funcionar perfeitamente');
    console.log('🚀 Reinicie o servidor e teste GET /api/permission');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n🔌 Desconectado do MongoDB Atlas');
    }
  }
}

createAtlasData();
