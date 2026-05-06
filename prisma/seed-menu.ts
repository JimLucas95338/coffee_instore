import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedMenu() {
  console.log('Seeding in-store menu...');

  // Create add-ons
  const addOns = [
    { name: 'Extra Shot', price: 0.75, category: 'EXTRA', sortOrder: 1 },
    { name: 'Vanilla Syrup', price: 0.60, category: 'SYRUP', sortOrder: 2 },
    { name: 'Caramel Syrup', price: 0.60, category: 'SYRUP', sortOrder: 3 },
    { name: 'Hazelnut Syrup', price: 0.60, category: 'SYRUP', sortOrder: 4 },
    { name: 'Mocha Syrup', price: 0.60, category: 'SYRUP', sortOrder: 5 },
    { name: 'Lavender Syrup', price: 0.75, category: 'SYRUP', sortOrder: 6 },
    { name: 'Whipped Cream', price: 0.50, category: 'TOPPING', sortOrder: 7 },
    { name: 'Oat Milk Upgrade', price: 0.70, category: 'EXTRA', sortOrder: 8 },
    { name: 'Almond Milk Upgrade', price: 0.70, category: 'EXTRA', sortOrder: 9 },
  ];

  const createdAddOns = [];
  for (const addOn of addOns) {
    const created = await prisma.menuAddOn.upsert({
      where: { id: addOn.name.toLowerCase().replace(/\s+/g, '-') },
      update: addOn,
      create: { id: addOn.name.toLowerCase().replace(/\s+/g, '-'), ...addOn },
    });
    createdAddOns.push(created);
  }
  console.log(`Created ${createdAddOns.length} add-ons`);

  // Espresso drink add-on IDs (all syrups + extra shot + whipped cream)
  const espressoAddOnIds = createdAddOns
    .filter((a) => ['SYRUP', 'EXTRA', 'TOPPING'].includes(a.category))
    .map((a) => ({ id: a.id }));

  // Menu items
  const menuItems = [
    // Espresso drinks
    {
      id: 'latte',
      name: 'Latte',
      description: 'Espresso with steamed milk and light foam',
      category: 'ESPRESSO',
      basePrice: 5.25,
      mediumPrice: 5.95,
      largePrice: 6.45,
      sortOrder: 1,
      allowSizes: true,
      allowMilk: true,
      allowTemp: true,
    },
    {
      id: 'cappuccino',
      name: 'Cappuccino',
      description: 'Equal parts espresso, steamed milk, and foam',
      category: 'ESPRESSO',
      basePrice: 4.50,
      mediumPrice: 5.25,
      largePrice: 5.75,
      sortOrder: 2,
      allowSizes: true,
      allowMilk: true,
      allowTemp: true,
    },
    {
      id: 'americano',
      name: 'Americano',
      description: 'Espresso with hot water for a smooth, rich flavor',
      category: 'ESPRESSO',
      basePrice: 3.50,
      mediumPrice: 4.00,
      largePrice: 4.50,
      sortOrder: 3,
      allowSizes: true,
      allowMilk: false,
      allowTemp: true,
    },
    {
      id: 'mocha',
      name: 'Mocha',
      description: 'Espresso with chocolate and steamed milk, topped with whipped cream',
      category: 'ESPRESSO',
      basePrice: 5.25,
      mediumPrice: 5.75,
      largePrice: 6.25,
      sortOrder: 4,
      allowSizes: true,
      allowMilk: true,
      allowTemp: true,
    },
    {
      id: 'flat-white',
      name: 'Flat White',
      description: 'Double ristretto with velvety steamed milk',
      category: 'ESPRESSO',
      basePrice: 4.75,
      mediumPrice: 5.50,
      largePrice: 6.00,
      sortOrder: 5,
      allowSizes: true,
      allowMilk: true,
      allowTemp: false,
    },
    {
      id: 'espresso',
      name: 'Espresso',
      description: 'Single or double shot of pure espresso',
      category: 'ESPRESSO',
      basePrice: 3.00,
      mediumPrice: 4.00,
      largePrice: null,
      sortOrder: 6,
      allowSizes: true,
      allowMilk: false,
      allowTemp: false,
    },
    {
      id: 'macchiato',
      name: 'Macchiato',
      description: 'Espresso marked with a dollop of foam',
      category: 'ESPRESSO',
      basePrice: 3.75,
      mediumPrice: 4.50,
      largePrice: 5.00,
      sortOrder: 7,
      allowSizes: true,
      allowMilk: true,
      allowTemp: true,
    },

    // Drip coffee
    {
      id: 'drip-coffee',
      name: 'Drip Coffee',
      description: 'Freshly brewed house blend',
      category: 'DRIP',
      basePrice: 2.50,
      mediumPrice: 3.00,
      largePrice: 3.50,
      sortOrder: 1,
      allowSizes: true,
      allowMilk: false,
      allowTemp: true,
    },
    {
      id: 'pour-over',
      name: 'Pour Over',
      description: 'Hand-poured single origin, brewed to order',
      category: 'DRIP',
      basePrice: 4.00,
      mediumPrice: 4.75,
      largePrice: 5.25,
      sortOrder: 2,
      allowSizes: true,
      allowMilk: false,
      allowTemp: false,
    },

    // Cold drinks
    {
      id: 'cold-brew',
      name: 'Cold Brew',
      description: 'Slow-steeped for 18 hours, smooth and bold',
      category: 'COLD',
      basePrice: 4.25,
      mediumPrice: 4.75,
      largePrice: 5.25,
      sortOrder: 1,
      allowSizes: true,
      allowMilk: false,
      allowTemp: false,
    },
    {
      id: 'iced-latte',
      name: 'Iced Latte',
      description: 'Espresso poured over ice with cold milk',
      category: 'COLD',
      basePrice: 4.75,
      mediumPrice: 5.50,
      largePrice: 6.00,
      sortOrder: 2,
      allowSizes: true,
      allowMilk: true,
      allowTemp: false,
    },
    {
      id: 'frappe',
      name: 'Frappe',
      description: 'Blended iced coffee with your choice of flavor',
      category: 'COLD',
      basePrice: 5.50,
      mediumPrice: 6.00,
      largePrice: 6.50,
      sortOrder: 3,
      allowSizes: true,
      allowMilk: true,
      allowTemp: false,
    },

    // Tea
    {
      id: 'chai-latte',
      name: 'Chai Latte',
      description: 'Spiced chai tea with steamed milk',
      category: 'TEA',
      basePrice: 4.50,
      mediumPrice: 5.00,
      largePrice: 5.50,
      sortOrder: 1,
      allowSizes: true,
      allowMilk: true,
      allowTemp: true,
    },
    {
      id: 'matcha-latte',
      name: 'Matcha Latte',
      description: 'Ceremonial grade matcha with steamed milk',
      category: 'TEA',
      basePrice: 5.00,
      mediumPrice: 5.50,
      largePrice: 6.00,
      sortOrder: 2,
      allowSizes: true,
      allowMilk: true,
      allowTemp: true,
    },
    {
      id: 'hot-tea',
      name: 'Hot Tea',
      description: 'Selection of premium loose leaf teas',
      category: 'TEA',
      basePrice: 3.00,
      mediumPrice: 3.50,
      largePrice: 4.00,
      sortOrder: 3,
      allowSizes: true,
      allowMilk: false,
      allowTemp: false,
    },

    // Food
    {
      id: 'muffin',
      name: 'Muffin',
      description: 'Freshly baked blueberry or chocolate chip',
      category: 'FOOD',
      basePrice: 3.50,
      mediumPrice: null,
      largePrice: null,
      sortOrder: 1,
      allowSizes: false,
      allowMilk: false,
      allowTemp: false,
    },
    {
      id: 'croissant',
      name: 'Butter Croissant',
      description: 'Flaky, buttery French-style croissant',
      category: 'FOOD',
      basePrice: 3.75,
      mediumPrice: null,
      largePrice: null,
      sortOrder: 2,
      allowSizes: false,
      allowMilk: false,
      allowTemp: false,
    },
    {
      id: 'bagel',
      name: 'Bagel with Cream Cheese',
      description: 'Toasted bagel with house cream cheese',
      category: 'FOOD',
      basePrice: 4.25,
      mediumPrice: null,
      largePrice: null,
      sortOrder: 3,
      allowSizes: false,
      allowMilk: false,
      allowTemp: false,
    },
    {
      id: 'breakfast-sandwich',
      name: 'Breakfast Sandwich',
      description: 'Egg, cheese, and choice of bacon or sausage on a brioche bun',
      category: 'FOOD',
      basePrice: 6.50,
      mediumPrice: null,
      largePrice: null,
      sortOrder: 4,
      allowSizes: false,
      allowMilk: false,
      allowTemp: false,
    },
  ];

  for (const item of menuItems) {
    const { id, ...data } = item;
    const hasDrinkAddOns = ['ESPRESSO', 'COLD', 'TEA'].includes(data.category);

    await prisma.menuItem.upsert({
      where: { id },
      update: {
        ...data,
        ...(hasDrinkAddOns ? { addOns: { set: espressoAddOnIds } } : {}),
      },
      create: {
        id,
        ...data,
        ...(hasDrinkAddOns ? { addOns: { connect: espressoAddOnIds } } : {}),
      },
    });
  }
  console.log(`Created ${menuItems.length} menu items`);

  console.log('In-store menu seeding complete!');
}

seedMenu()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
