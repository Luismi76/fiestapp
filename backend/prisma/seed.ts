import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Limpiar datos existentes
  console.log('🧹 Limpiando datos existentes...');
  await prisma.message.deleteMany();
  await prisma.review.deleteMany();
  await prisma.match.deleteMany();
  await prisma.experienceAvailability.deleteMany();
  await prisma.experience.deleteMany();
  await prisma.festival.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.user.deleteMany();

  // Crear usuarios
  console.log('👥 Creando usuarios...');
  const passwordHash = await bcrypt.hash('password123', 10);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        id: 'user-maria',
        email: 'maria@test.com',
        password: passwordHash,
        name: 'María García',
        age: 32,
        bio: 'Sevillana de toda la vida. Me encanta compartir nuestras tradiciones con visitantes de todo el mundo. La Feria de Abril es mi fiesta favorita y llevo más de 20 años disfrutándola en nuestra caseta familiar.',
        city: 'Sevilla',
        avatar: '/images/user_maria.png',
        verified: true,
      },
    }),
    prisma.user.create({
      data: {
        id: 'user-carlos',
        email: 'carlos@test.com',
        password: passwordHash,
        name: 'Carlos Martínez',
        age: 28,
        bio: 'Pamplonés de nacimiento. Llevo corriendo encierros desde los 18 años. Conozco cada rincón de la ciudad y los mejores sitios para vivir San Fermín como un local.',
        city: 'Pamplona',
        avatar: '/images/user_carlos.png',
        verified: true,
      },
    }),
    prisma.user.create({
      data: {
        id: 'user-laura',
        email: 'laura@test.com',
        password: passwordHash,
        name: 'Laura Pérez',
        age: 35,
        bio: 'Valenciana apasionada por las Fallas. Mi familia lleva 4 generaciones siendo falleros. La paella de mi abuela es famosa en todo el barrio.',
        city: 'Valencia',
        avatar: '/images/user_laura.png',
        verified: true,
      },
    }),
    prisma.user.create({
      data: {
        id: 'user-pedro',
        email: 'pedro@test.com',
        password: passwordHash,
        name: 'Pedro Sánchez',
        age: 26,
        bio: 'De Buñol, vivo La Tomatina desde pequeño. ¡La mejor fiesta del mundo! Veterano de más de 10 ediciones, conozco todos los trucos para sobrevivir.',
        city: 'Valencia',
        avatar: '/images/user_pedro.png',
        verified: false,
      },
    }),
    prisma.user.create({
      data: {
        id: 'user-juan',
        email: 'juan@test.com',
        password: passwordHash,
        name: 'Juan Romero',
        age: 45,
        bio: 'Cofrade desde hace 30 años. La Semana Santa es mi pasión. He sido costalero y ahora guío a visitantes por las procesiones más emblemáticas de Sevilla.',
        city: 'Sevilla',
        avatar: '/images/user_juan.png',
        verified: true,
      },
    }),
    prisma.user.create({
      data: {
        id: 'user-ana',
        email: 'ana@test.com',
        password: passwordHash,
        name: 'Ana López',
        age: 29,
        bio: 'Gaditana de corazón. El Carnaval corre por mis venas. Mi padre fue autor de chirigotas y crecí entre comparsas y disfraces.',
        city: 'Cádiz',
        avatar: '/images/user_ana.png',
        verified: true,
      },
    }),
    prisma.user.create({
      data: {
        id: 'user-demo',
        email: 'demo@test.com',
        password: passwordHash,
        name: 'Usuario Demo',
        age: 30,
        bio: 'Viajero entusiasta buscando experiencias auténticas en las festividades españolas. Me encanta conocer las tradiciones locales de la mano de sus protagonistas.',
        city: 'Madrid',
        avatar: '/images/user_demo.png',
        verified: false,
      },
    }),
  ]);

  console.log(`✅ ${users.length} usuarios creados`);

  // Crear festividades
  console.log('🎪 Creando festividades...');
  const festivals = await Promise.all([
    prisma.festival.create({
      data: {
        id: 'fest-feria',
        name: 'Feria de Abril',
        city: 'Sevilla',
        description: 'La Feria de Abril es la fiesta más importante de Sevilla. Durante una semana, la ciudad se llena de casetas, farolillos, caballos y el sonido de las sevillanas.',
        startDate: new Date('2026-04-20'),
        endDate: new Date('2026-04-26'),
      },
    }),
    prisma.festival.create({
      data: {
        id: 'fest-sanfermin',
        name: 'San Fermín',
        city: 'Pamplona',
        description: 'Los Sanfermines son las fiestas más internacionales de España. El encierro de toros por las calles de Pamplona es conocido en todo el mundo.',
        startDate: new Date('2026-07-06'),
        endDate: new Date('2026-07-14'),
      },
    }),
    prisma.festival.create({
      data: {
        id: 'fest-fallas',
        name: 'Las Fallas',
        city: 'Valencia',
        description: 'Las Fallas de Valencia son una fiesta declarada Patrimonio de la Humanidad. Monumentos de cartón piedra, mascletàs y la cremà final.',
        startDate: new Date('2026-03-15'),
        endDate: new Date('2026-03-19'),
      },
    }),
    prisma.festival.create({
      data: {
        id: 'fest-tomatina',
        name: 'La Tomatina',
        city: 'Buñol',
        description: 'La batalla de tomates más grande del mundo. Una fiesta única donde miles de personas se lanzan tomates durante una hora.',
        startDate: new Date('2026-08-26'),
        endDate: new Date('2026-08-26'),
      },
    }),
    prisma.festival.create({
      data: {
        id: 'fest-semanasanta',
        name: 'Semana Santa',
        city: 'Sevilla',
        description: 'La Semana Santa de Sevilla es una de las celebraciones religiosas más impresionantes del mundo, con procesiones que recorren la ciudad.',
        startDate: new Date('2026-03-29'),
        endDate: new Date('2026-04-05'),
      },
    }),
    prisma.festival.create({
      data: {
        id: 'fest-carnaval',
        name: 'Carnaval de Cádiz',
        city: 'Cádiz',
        description: 'El Carnaval de Cádiz es famoso por sus chirigotas, comparsas y el ingenio gaditano. Declarado Fiesta de Interés Turístico Internacional.',
        startDate: new Date('2026-02-12'),
        endDate: new Date('2026-02-22'),
      },
    }),
    prisma.festival.create({
      data: {
        id: 'fest-moros',
        name: 'Moros y Cristianos',
        city: 'Alcoy',
        description: 'Fiestas que conmemoran las batallas entre moros y cristianos. Desfiles espectaculares con trajes medievales.',
        startDate: new Date('2026-04-22'),
        endDate: new Date('2026-04-24'),
      },
    }),
    prisma.festival.create({
      data: {
        id: 'fest-merce',
        name: 'La Mercè',
        city: 'Barcelona',
        description: 'Las fiestas mayores de Barcelona. Castellers, correfocs, conciertos y cultura catalana en estado puro.',
        startDate: new Date('2026-09-20'),
        endDate: new Date('2026-09-24'),
      },
    }),
  ]);

  console.log(`✅ ${festivals.length} festividades creadas`);

  // Crear experiencias
  console.log('✨ Creando experiencias...');
  const experiences = await Promise.all([
    prisma.experience.create({
      data: {
        id: 'exp-1',
        title: 'Vive la Feria como un sevillano',
        description: 'Sumérgete en la magia de la Feria de Abril de la mano de una familia sevillana. Te abrimos las puertas de nuestra caseta para que vivas la fiesta como uno más. Mi abuela te enseñará a bailar sevillanas mientras disfrutas del ambiente único del Real. Una experiencia inolvidable que te hará sentir sevillano por un día.',
        festivalId: 'fest-feria',
        city: 'Sevilla',
        price: 45,
        type: 'pago',
        hostId: 'user-maria',
        photos: ['/images/feria_abril.png'],
        highlights: [
          'Traje de flamenca o traje corto auténtico incluido',
          'Acceso a caseta familiar con comida y bebida',
          'Clase de sevillanas con mi abuela',
          'Historia y tradiciones de la Feria',
          'Ambiente único del Real de la Feria',
        ],
        published: true,
      },
    }),
    prisma.experience.create({
      data: {
        id: 'exp-2',
        title: 'Encierro y tapas tradicionales',
        description: 'Vive San Fermín como un pamplonés de verdad. Te llevaré a ver el encierro desde mi balcón familiar, con las mejores vistas de la calle Estafeta. Después recorreremos los bares donde los locales celebramos las fiestas, lejos de las rutas turísticas. Una inmersión total en nuestras tradiciones.',
        festivalId: 'fest-sanfermin',
        city: 'Pamplona',
        price: null,
        type: 'intercambio',
        hostId: 'user-carlos',
        photos: ['/images/san_fermin.png'],
        highlights: [
          'Acceso a balcón privilegiado para el encierro',
          'Ruta de tapas por el casco antiguo',
          'Historia y tradiciones de San Fermín',
          'Consejos de un local pamplonés',
        ],
        published: true,
      },
    }),
    prisma.experience.create({
      data: {
        id: 'exp-3',
        title: 'Mascletà y paella valenciana',
        description: 'Siente el estruendo de la mascletà desde el corazón de Valencia. Te guardaré sitio en mi plaza favorita y después visitaremos las fallas más impresionantes. Para terminar, vendrás a casa a disfrutar de la paella que mi abuela lleva preparando 50 años. Prepárate para un día intenso y delicioso.',
        festivalId: 'fest-fallas',
        city: 'Valencia',
        price: 35,
        type: 'pago',
        hostId: 'user-laura',
        photos: ['/images/las_fallas.png'],
        highlights: [
          'Plaza reservada para la mascletà',
          'Tour guiado por las mejores fallas',
          'Paella tradicional casera',
          'Receta secreta de mi abuela',
        ],
        published: true,
      },
    }),
    prisma.experience.create({
      data: {
        id: 'exp-4',
        title: 'La batalla del tomate',
        description: 'Prepárate para la guerra más divertida del mundo. Como veterano de La Tomatina te guiaré para que sobrevivas y disfrutes al máximo. Después de la batalla, te espera una ducha y comida casera en mi casa para recuperar fuerzas. Una experiencia que recordarás toda la vida.',
        festivalId: 'fest-tomatina',
        city: 'Buñol',
        price: 25,
        type: 'ambos',
        hostId: 'user-pedro',
        photos: ['/images/la_tomatina.png'],
        highlights: [
          'Camiseta blanca y gafas incluidas',
          'Acompañamiento durante la batalla',
          'Zona para ducharte después',
          'Comida casera post-batalla',
          'Consejos de supervivencia de un veterano',
        ],
        published: true,
      },
    }),
    prisma.experience.create({
      data: {
        id: 'exp-5',
        title: 'Procesiones y saetas',
        description: 'La Semana Santa de Sevilla es única en el mundo. Como cofrade de toda la vida, te llevaré a vivir las procesiones más emotivas y te explicaré cada detalle: el arte de los pasos, el significado de las cofradías, los mejores rincones para fotografiar. Sentirás el escalofrío de una saeta en directo.',
        festivalId: 'fest-semanasanta',
        city: 'Sevilla',
        price: 30,
        type: 'pago',
        hostId: 'user-juan',
        photos: ['/images/semana_santa.png'],
        highlights: [
          'Ruta por procesiones emblemáticas',
          'Explicación histórica y religiosa',
          'Mejores puntos para fotografiar',
          'Tapas típicas de Semana Santa',
          'Saetas en directo',
        ],
        published: true,
      },
    }),
    prisma.experience.create({
      data: {
        id: 'exp-6',
        title: 'Carnaval gaditano auténtico',
        description: 'El Carnaval de Cádiz es ingenio, humor y fiesta sin parar. Te llevaré a escuchar las mejores chirigotas y comparsas, probarás el pescaíto frito más rico de España y terminaremos la noche en La Viña, el barrio más festivo de Cádiz. Prepárate para reír, cantar y bailar hasta el amanecer.',
        festivalId: 'fest-carnaval',
        city: 'Cádiz',
        price: null,
        type: 'intercambio',
        hostId: 'user-ana',
        photos: ['/images/carnaval.png'],
        highlights: [
          'Tour por las calles del Carnaval',
          'Visita al Teatro Falla',
          'Ruta gastronómica gaditana',
          'Fiesta en el barrio de La Viña',
          'Disfraces opcionales incluidos',
        ],
        published: true,
      },
    }),
  ]);

  console.log(`✅ ${experiences.length} experiencias creadas`);

  // Crear disponibilidad para las experiencias
  console.log('📅 Creando disponibilidad...');
  const availabilityData: { experienceId: string; date: Date; available: boolean }[] = [];

  // Feria de Abril - Abril 2026
  for (let day = 20; day <= 26; day++) {
    availabilityData.push({
      experienceId: 'exp-1',
      date: new Date(`2026-04-${day}`),
      available: true,
    });
  }

  // San Fermín - Julio 2026
  for (let day = 6; day <= 14; day++) {
    availabilityData.push({
      experienceId: 'exp-2',
      date: new Date(`2026-07-${day.toString().padStart(2, '0')}`),
      available: true,
    });
  }

  // Las Fallas - Marzo 2026
  for (let day = 15; day <= 19; day++) {
    availabilityData.push({
      experienceId: 'exp-3',
      date: new Date(`2026-03-${day}`),
      available: true,
    });
  }

  // La Tomatina - Agosto 2026
  availabilityData.push({
    experienceId: 'exp-4',
    date: new Date('2026-08-26'),
    available: true,
  });

  // Semana Santa - Marzo/Abril 2026
  for (let day = 29; day <= 31; day++) {
    availabilityData.push({
      experienceId: 'exp-5',
      date: new Date(`2026-03-${day}`),
      available: true,
    });
  }
  for (let day = 1; day <= 5; day++) {
    availabilityData.push({
      experienceId: 'exp-5',
      date: new Date(`2026-04-0${day}`),
      available: true,
    });
  }

  // Carnaval - Febrero 2026
  for (let day = 12; day <= 22; day++) {
    availabilityData.push({
      experienceId: 'exp-6',
      date: new Date(`2026-02-${day}`),
      available: true,
    });
  }

  await prisma.experienceAvailability.createMany({
    data: availabilityData,
  });

  console.log(`✅ ${availabilityData.length} fechas de disponibilidad creadas`);

  // Crear matches de ejemplo
  console.log('🤝 Creando matches...');
  const matches = await Promise.all([
    prisma.match.create({
      data: {
        id: 'match-1',
        experienceId: 'exp-1',
        requesterId: 'user-demo',
        hostId: 'user-maria',
        status: 'accepted',
        agreedDate: new Date('2026-04-22'),
      },
    }),
    prisma.match.create({
      data: {
        id: 'match-2',
        experienceId: 'exp-2',
        requesterId: 'user-demo',
        hostId: 'user-carlos',
        status: 'pending',
      },
    }),
    prisma.match.create({
      data: {
        id: 'match-3',
        experienceId: 'exp-6',
        requesterId: 'user-demo',
        hostId: 'user-ana',
        status: 'completed',
        agreedDate: new Date('2026-02-15'),
      },
    }),
    prisma.match.create({
      data: {
        id: 'match-4',
        experienceId: 'exp-3',
        requesterId: 'user-carlos',
        hostId: 'user-laura',
        status: 'accepted',
        agreedDate: new Date('2026-03-17'),
      },
    }),
    prisma.match.create({
      data: {
        id: 'match-5',
        experienceId: 'exp-1',
        requesterId: 'user-ana',
        hostId: 'user-maria',
        status: 'pending',
      },
    }),
  ]);

  console.log(`✅ ${matches.length} matches creados`);

  // Crear mensajes de ejemplo
  console.log('💬 Creando mensajes...');
  const messages = await Promise.all([
    // Conversación match-1 (María y Demo)
    prisma.message.create({
      data: {
        matchId: 'match-1',
        senderId: 'user-demo',
        content: '¡Hola María! Me encantaría vivir la experiencia de la Feria de Abril con tu familia. ¿Qué días tendrías disponibilidad?',
        read: true,
      },
    }),
    prisma.message.create({
      data: {
        matchId: 'match-1',
        senderId: 'user-maria',
        content: '¡Hola! Qué ilusión me hace. Tenemos disponibilidad todos los días de la Feria pero te recomiendo el miércoles o jueves que hay menos gente.',
        read: true,
      },
    }),
    prisma.message.create({
      data: {
        matchId: 'match-1',
        senderId: 'user-demo',
        content: 'Perfecto, el miércoles 22 me viene genial. ¿Qué talla de traje necesitarías saber?',
        read: true,
      },
    }),
    prisma.message.create({
      data: {
        matchId: 'match-1',
        senderId: 'user-maria',
        content: '¡Genial! Dime tu talla y altura para prepararte el traje. Nos vemos a las 19h en la entrada del Real. ¡Vas a flipar!',
        read: true,
      },
    }),

    // Conversación match-2 (Carlos y Demo)
    prisma.message.create({
      data: {
        matchId: 'match-2',
        senderId: 'user-demo',
        content: 'Hola Carlos, estoy muy interesado en vivir San Fermín contigo. ¿Sigue disponible la experiencia?',
        read: true,
      },
    }),
    prisma.message.create({
      data: {
        matchId: 'match-2',
        senderId: 'user-carlos',
        content: '¡Buenas! Sí, sigue disponible. ¿Qué días estarás en Pamplona? El día 7 es el mejor para ver el encierro desde mi balcón.',
        read: false,
      },
    }),

    // Conversación match-3 (Ana y Demo) - completada
    prisma.message.create({
      data: {
        matchId: 'match-3',
        senderId: 'user-demo',
        content: '¡Ana! ¡Qué experiencia más increíble! El Carnaval de Cádiz ha superado todas mis expectativas.',
        read: true,
      },
    }),
    prisma.message.create({
      data: {
        matchId: 'match-3',
        senderId: 'user-ana',
        content: '¡Me alegro mucho! Has sido un invitado genial. Espero que vuelvas el año que viene 🎭',
        read: true,
      },
    }),
  ]);

  console.log(`✅ ${messages.length} mensajes creados`);

  // Crear reviews de ejemplo
  console.log('⭐ Creando reviews...');
  const reviews = await Promise.all([
    prisma.review.create({
      data: {
        experienceId: 'exp-1',
        authorId: 'user-carlos',
        targetId: 'user-maria',
        rating: 5,
        comment: '¡Increíble experiencia! María fue muy amable y la caseta estaba genial. La mejor forma de vivir la Feria.',
      },
    }),
    prisma.review.create({
      data: {
        experienceId: 'exp-1',
        authorId: 'user-ana',
        targetId: 'user-maria',
        rating: 5,
        comment: 'María es una anfitriona excepcional. Su familia me trató como a uno más. Totalmente recomendado.',
      },
    }),
    prisma.review.create({
      data: {
        experienceId: 'exp-2',
        authorId: 'user-laura',
        targetId: 'user-carlos',
        rating: 5,
        comment: 'Carlos conoce todos los rincones de Pamplona. Una experiencia auténtica que no olvidaré.',
      },
    }),
    prisma.review.create({
      data: {
        experienceId: 'exp-3',
        authorId: 'user-maria',
        targetId: 'user-laura',
        rating: 5,
        comment: 'La paella de Laura es la mejor que he probado. Las Fallas desde dentro, una pasada.',
      },
    }),
    prisma.review.create({
      data: {
        experienceId: 'exp-6',
        authorId: 'user-demo',
        targetId: 'user-ana',
        rating: 5,
        comment: 'El Carnaval de Cádiz con Ana fue espectacular. Las chirigotas, el pescaíto, la fiesta... ¡Volveré!',
      },
    }),
  ]);

  console.log(`✅ ${reviews.length} reviews creadas`);

  // Crear wallets
  console.log('💰 Creando wallets...');
  await Promise.all(
    users.map((user) =>
      prisma.wallet.create({
        data: {
          userId: user.id,
          balance: user.id === 'user-demo' ? 100 : 0,
        },
      }),
    ),
  );

  console.log(`✅ ${users.length} wallets creadas`);

  console.log('\n🎉 ¡Seed completado con éxito!');
  console.log('\n📋 Datos de prueba:');
  console.log('   Email: demo@test.com');
  console.log('   Password: password123');
  console.log('\n   Otros usuarios: maria@test.com, carlos@test.com, etc.');
  console.log('   Todos con password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
