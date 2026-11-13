import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
const db = new PrismaClient();
const products = [
  [
    'abrigo-escultural',
    'Abrigo escultural',
    'Abrigos',
    38900,
    'Lana virgen italiana',
    'photo-1548624149-f3221d722dca',
  ],
  [
    'blazer-esencial',
    'Blazer esencial',
    'Sastrería',
    24500,
    'Lana y viscosa',
    'photo-1591047139829-d91aecb6caea',
  ],
  [
    'vestido-origen',
    'Vestido Origen',
    'Vestidos',
    19800,
    'Lino europeo',
    'photo-1595777457583-95e059d581b8',
  ],
  [
    'camisa-de-seda',
    'Camisa de seda',
    'Camisas',
    14900,
    'Seda natural',
    'photo-1598554747436-c9293d6a588f',
  ],
  [
    'pantalon-pliegue',
    'Pantalón de pliegue',
    'Sastrería',
    17500,
    'Lana fría',
    'photo-1624378439575-d8705ad7ae80',
  ],
  [
    'bolso-forma',
    'Bolso Forma',
    'Accesorios',
    22500,
    'Piel de curtido vegetal',
    'photo-1548036328-c9fa89d128fa',
  ],
  [
    'jersey-textura',
    'Jersey Textura',
    'Punto',
    16500,
    'Algodón orgánico',
    'photo-1576566588028-4147f3842f27',
  ],
  [
    'gabardina-estudio',
    'Gabardina Estudio',
    'Abrigos',
    32000,
    'Algodón de alta densidad',
    'photo-1544923246-77307dd654cb',
  ],
  [
    'vestido-noche',
    'Vestido de noche',
    'Vestidos',
    27500,
    'Satén de viscosa',
    'photo-1566174053879-31528523f8ae',
  ],
  [
    'camisa-arquitectura',
    'Camisa Arquitectura',
    'Camisas',
    13900,
    'Popelín de algodón',
    'photo-1596755094514-f87e34085b2c',
  ],
  [
    'bolso-archivo',
    'Bolso Archivo',
    'Accesorios',
    18900,
    'Piel de curtido vegetal',
    'photo-1584917865442-de89df76afd3',
  ],
  [
    'punto-sereno',
    'Punto Sereno',
    'Punto',
    18500,
    'Lana merino',
    'photo-1434389677669-e08b4cac3105',
  ],
] as const;
async function main() {
  const collection = await db.collection.upsert({
    where: { slug: 'the-considered-wardrobe' },
    create: { slug: 'the-considered-wardrobe', name: 'The Considered Wardrobe' },
    update: {},
  });
  for (const [slug, name, categoryName, price, material, photo] of products) {
    const category = await db.category.upsert({
      where: { name: categoryName },
      create: {
        name: categoryName,
        slug: categoryName
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase(),
      },
      update: {},
    });
    const product = await db.product.upsert({
      where: { slug },
      create: {
        slug,
        name,
        price,
        material,
        description:
          'Una silueta precisa y una presencia serena. Diseñada para acompañarte temporada tras temporada, con una atención especial al tacto, la caída y los pequeños detalles.',
        featured: true,
        categoryId: category.id,
        collectionId: collection.id,
      },
      update: {},
    });
    if (!(await db.productImage.count({ where: { productId: product.id } })))
      await db.productImage.create({
        data: { productId: product.id, url: `/images/${photo}.jpg`, alt: name },
      });
    for (const size of categoryName === 'Accesorios' ? ['Única'] : ['XS', 'S', 'M', 'L'])
      for (const color of ['Arena', 'Negro'])
        await db.variant.upsert({
          where: { sku: `${slug}-${size}-${color}` },
          create: { sku: `${slug}-${size}-${color}`, productId: product.id, size, color, stock: 8 },
          update: {},
        });
  }
  await db.setting.upsert({ where: { id: 'store' }, create: { id: 'store' }, update: {} });
  await db.coupon.upsert({
    where: { code: 'WELCOME10' },
    create: { code: 'WELCOME10', percent: 10 },
    update: {},
  });
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    if (process.env.ADMIN_PASSWORD.length < 16)
      throw new Error('ADMIN_PASSWORD must have at least 16 characters');
    await db.user.upsert({
      where: { email: process.env.ADMIN_EMAIL },
      create: {
        email: process.env.ADMIN_EMAIL,
        name: 'Private administrator',
        passwordHash: await hash(process.env.ADMIN_PASSWORD, 12),
        role: 'ADMIN',
      },
      update: {},
    });
  }
  console.log(
    'Seed complete: 12 fictional products, WELCOME10 coupon. No public admin credentials.',
  );
}
main().finally(() => db.$disconnect());
