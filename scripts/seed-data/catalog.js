/**
 * Sample catalog used by `npm run seed`.
 * Prices are in cents. Photos are served by the Unsplash CDN.
 */
const img = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;

const categories = [
  {
    slug: 'apparel',
    name: 'Apparel',
    description: 'Everyday essentials in natural fabrics, cut to last.',
    imageUrl: img('1490481651871-ab68de25d43d'),
  },
  {
    slug: 'footwear',
    name: 'Footwear',
    description: 'Sneakers and leather shoes made for daily wear.',
    imageUrl: img('1460353581641-37baddab0fa2'),
  },
  {
    slug: 'accessories',
    name: 'Accessories',
    description: 'Watches, bags and small leather goods.',
    imageUrl: img('1548036328-c9fa89d128fa'),
  },
  {
    slug: 'home',
    name: 'Home & Living',
    description: 'Furniture, lighting and tableware for calm spaces.',
    imageUrl: img('1555041469-a586c61ea9bc'),
  },
  {
    slug: 'electronics',
    name: 'Electronics',
    description: 'Audio, cameras and desk gear with timeless design.',
    imageUrl: img('1505740420928-5e560c06d30e'),
  },
  {
    slug: 'beauty',
    name: 'Beauty',
    description: 'Skincare and fragrance with clean ingredients.',
    imageUrl: img('1556228578-8c89e6adf883'),
  },
];

const products = [
  // --- Apparel ---------------------------------------------------------
  {
    category: 'apparel', slug: 'organic-cotton-crew-tee', name: 'Organic Cotton Crew T-Shirt',
    priceCents: 2900, rating: 4.6, reviewCount: 412, stock: 140, isFeatured: true,
    imageUrl: img('1521572163474-6864f9cf17ab'),
    description: 'A midweight crew neck tee knitted from 100% GOTS-certified organic cotton. Pre-washed for a soft hand feel and minimal shrinkage, with a regular fit that sits just below the hip.',
  },
  {
    category: 'apparel', slug: 'heavyweight-fleece-hoodie', name: 'Heavyweight Fleece Hoodie',
    priceCents: 7900, rating: 4.7, reviewCount: 268, stock: 64, isFeatured: true,
    imageUrl: img('1556821840-3a63f95609a7'),
    description: 'Brushed-back 420 gsm cotton fleece with a double-layer hood, ribbed cuffs and a roomy kangaroo pocket. Garment dyed for a lived-in colour that softens further with every wash.',
  },
  {
    category: 'apparel', slug: 'waxed-cotton-field-jacket', name: 'Waxed Cotton Field Jacket',
    priceCents: 21900, rating: 4.8, reviewCount: 96, stock: 22, isFeatured: false,
    imageUrl: img('1591047139829-d91aecb6caea'),
    description: 'A weather-resistant field jacket in waxed British cotton with a corduroy collar, four bellows pockets and a two-way brass zip. Can be re-waxed to keep it going for years.',
  },
  {
    category: 'apparel', slug: 'relaxed-linen-shirt', name: 'Relaxed Linen Shirt',
    priceCents: 6900, rating: 4.4, reviewCount: 153, stock: 58, isFeatured: false,
    imageUrl: img('1602810318383-e386cc2a3ccf'),
    description: 'Breathable European flax linen in a relaxed silhouette with a camp collar and mother-of-pearl buttons. Ideal for warm days, it only gets better with wear.',
  },
  {
    category: 'apparel', slug: 'selvedge-denim-straight', name: 'Selvedge Denim — Straight Fit',
    priceCents: 12900, rating: 4.5, reviewCount: 187, stock: 40, isFeatured: false,
    imageUrl: img('1542272604-787c3835535d'),
    description: '13.5 oz raw selvedge denim woven on vintage shuttle looms. A straight leg with a mid rise, copper rivets and a chain-stitched hem.',
  },
  {
    category: 'apparel', slug: 'everyday-pocket-tee', name: 'Everyday Pocket Tee',
    priceCents: 3200, rating: 4.3, reviewCount: 221, stock: 0, isFeatured: false,
    imageUrl: img('1576566588028-4147f3842f27'),
    description: 'Our classic tee with a reinforced chest pocket. Combed ring-spun cotton jersey with a taped neckline that keeps its shape.',
  },

  // --- Footwear --------------------------------------------------------
  {
    category: 'footwear', slug: 'everyday-leather-sneaker', name: 'Everyday Leather Sneaker',
    priceCents: 11900, rating: 4.6, reviewCount: 534, stock: 75, isFeatured: true,
    imageUrl: img('1549298916-b41d501d3772'),
    description: 'A clean low-top in full-grain leather with a cushioned cork footbed and a stitched natural rubber cupsole. Goes with everything from denim to tailoring.',
  },
  {
    category: 'footwear', slug: 'lightweight-road-runner', name: 'Lightweight Road Runner',
    priceCents: 13500, rating: 4.5, reviewCount: 389, stock: 52, isFeatured: false,
    imageUrl: img('1542291026-7eec264c27ff'),
    description: 'A responsive daily trainer with an engineered mesh upper, foam midsole and a durable rubber outsole for road miles.',
  },
  {
    category: 'footwear', slug: 'canvas-low-top', name: 'Canvas Low-Top',
    priceCents: 6500, rating: 4.2, reviewCount: 640, stock: 120, isFeatured: false,
    imageUrl: img('1525966222134-fcfa99b8ae77'),
    description: 'A vulcanised canvas sneaker with a padded collar and a waffle-grip sole. Simple, light and comfortable from the first wear.',
  },
  {
    category: 'footwear', slug: 'trail-knit-sneaker', name: 'Trail Knit Sneaker',
    priceCents: 14500, rating: 4.4, reviewCount: 112, stock: 30, isFeatured: false,
    imageUrl: img('1600185365483-26d7a4cc7519'),
    description: 'A sock-like knit upper on a grippy lugged sole. Built for easy trails and city weekends alike.',
  },
  {
    category: 'footwear', slug: 'heritage-court-sneaker', name: 'Heritage Court Sneaker',
    priceCents: 9900, rating: 4.3, reviewCount: 203, stock: 44, isFeatured: false,
    imageUrl: img('1460353581641-37baddab0fa2'),
    description: 'A retro court silhouette with suede overlays, a padded tongue and a gum rubber outsole.',
  },

  // --- Accessories -----------------------------------------------------
  {
    category: 'accessories', slug: 'minimalist-analog-watch', name: 'Minimalist Analog Watch',
    priceCents: 18900, rating: 4.7, reviewCount: 301, stock: 35, isFeatured: true,
    imageUrl: img('1523275335684-37898b6baf30'),
    description: 'A 38 mm brushed steel case with a sapphire-coated crystal, Japanese quartz movement and a vegetable-tanned leather strap. Water resistant to 50 m.',
  },
  {
    category: 'accessories', slug: 'classic-acetate-sunglasses', name: 'Classic Acetate Sunglasses',
    priceCents: 8900, rating: 4.4, reviewCount: 178, stock: 60, isFeatured: false,
    imageUrl: img('1572635196237-14b3f281503f'),
    description: 'Hand-polished acetate frames with polarised, UV400 lenses and five-barrel hinges. Comes with a recycled leather case.',
  },
  {
    category: 'accessories', slug: 'structured-leather-tote', name: 'Structured Leather Tote',
    priceCents: 16900, rating: 4.6, reviewCount: 142, stock: 18, isFeatured: true,
    imageUrl: img('1548036328-c9fa89d128fa'),
    description: 'Pebbled leather tote with a magnetic closure, interior zip pocket and a padded sleeve that fits a 13" laptop.',
  },
  {
    category: 'accessories', slug: 'roll-top-canvas-backpack', name: 'Roll-Top Canvas Backpack',
    priceCents: 9500, rating: 4.5, reviewCount: 256, stock: 48, isFeatured: false,
    imageUrl: img('1553062407-98eeb64c6a62'),
    description: 'Water-resistant waxed canvas with leather trims, a roll-top closure and a padded laptop compartment. 22 litres.',
  },
  {
    category: 'accessories', slug: 'slim-leather-wallet', name: 'Slim Leather Wallet',
    priceCents: 4900, rating: 4.6, reviewCount: 389, stock: 90, isFeatured: false,
    imageUrl: img('1627123424574-724758594e93'),
    description: 'A bifold wallet in full-grain leather with six card slots and a note compartment. Slim enough for a front pocket.',
  },
  {
    category: 'accessories', slug: 'round-metal-sunglasses', name: 'Round Metal Sunglasses',
    priceCents: 7500, rating: 4.1, reviewCount: 94, stock: 37, isFeatured: false,
    imageUrl: img('1511499767150-a48a237f0083'),
    description: 'Lightweight titanium frames with adjustable nose pads and gradient lenses for everyday sun protection.',
  },

  // --- Home & Living ---------------------------------------------------
  {
    category: 'home', slug: 'stoneware-mug-set', name: 'Stoneware Mug Set (Set of 4)',
    priceCents: 4800, rating: 4.8, reviewCount: 233, stock: 70, isFeatured: true,
    imageUrl: img('1514228742587-6b1558fcca3d'),
    description: 'Wheel-thrown stoneware mugs with a reactive glaze, so each piece is slightly unique. 350 ml, dishwasher and microwave safe.',
  },
  {
    category: 'home', slug: 'oak-lounge-chair', name: 'Oak Lounge Chair',
    priceCents: 42900, rating: 4.7, reviewCount: 58, stock: 9, isFeatured: false,
    imageUrl: img('1567538096630-e0c55bd6374c'),
    description: 'Solid oak frame with a woven paper-cord seat. A low, comfortable lounge chair that suits living rooms and reading corners.',
  },
  {
    category: 'home', slug: 'ceramic-table-lamp', name: 'Ceramic Table Lamp',
    priceCents: 12900, rating: 4.5, reviewCount: 87, stock: 26, isFeatured: false,
    imageUrl: img('1507473885765-e6ed057f782c'),
    description: 'A matte ceramic base with a linen shade that casts warm, diffused light. Includes an inline dimmer switch.',
  },
  {
    category: 'home', slug: 'three-seat-linen-sofa', name: 'Three-Seat Linen Sofa',
    priceCents: 149000, rating: 4.6, reviewCount: 41, stock: 4, isFeatured: false,
    imageUrl: img('1555041469-a586c61ea9bc'),
    description: 'Deep seats, feather-wrapped cushions and removable washable linen covers on a kiln-dried hardwood frame.',
  },
  {
    category: 'home', slug: 'solid-wood-dining-chair', name: 'Solid Wood Dining Chair',
    priceCents: 18900, rating: 4.4, reviewCount: 66, stock: 32, isFeatured: false,
    imageUrl: img('1503602642458-232111445657'),
    description: 'A Scandinavian-inspired dining chair turned from solid ash, finished with a natural hard-wax oil.',
  },
  {
    category: 'home', slug: 'terracotta-planter-trio', name: 'Terracotta Planter Trio',
    priceCents: 3900, rating: 4.3, reviewCount: 119, stock: 85, isFeatured: false,
    imageUrl: img('1485955900006-10f4d324d411'),
    description: 'Three unglazed terracotta pots with drainage holes and saucers, in small, medium and large sizes.',
  },

  // --- Electronics -----------------------------------------------------
  {
    category: 'electronics', slug: 'wireless-over-ear-headphones', name: 'Wireless Over-Ear Headphones',
    priceCents: 24900, rating: 4.7, reviewCount: 822, stock: 55, isFeatured: true,
    imageUrl: img('1505740420928-5e560c06d30e'),
    description: 'Active noise cancellation, 40 hours of battery life and memory-foam ear cushions wrapped in protein leather. Folds flat into the included case.',
  },
  {
    category: 'electronics', slug: 'instant-film-camera', name: 'Instant Film Camera',
    priceCents: 12900, rating: 4.4, reviewCount: 305, stock: 28, isFeatured: false,
    imageUrl: img('1526170375885-4d8ecf77b99f'),
    description: 'Point, shoot and print. Automatic exposure, a built-in flash and a selfie mirror, compatible with standard instant film.',
  },
  {
    category: 'electronics', slug: 'fitness-smartwatch', name: 'Fitness Smartwatch',
    priceCents: 19900, rating: 4.3, reviewCount: 447, stock: 46, isFeatured: false,
    imageUrl: img('1546868871-7041f2a55e12'),
    description: 'Heart-rate, sleep and workout tracking with built-in GPS and up to seven days of battery life on a single charge.',
  },
  {
    category: 'electronics', slug: 'portable-bluetooth-speaker', name: 'Portable Bluetooth Speaker',
    priceCents: 8900, rating: 4.5, reviewCount: 510, stock: 80, isFeatured: true,
    imageUrl: img('1608043152269-423dbba4e7e1'),
    description: '360° sound in a compact, IP67 waterproof body with a fabric finish. Up to 15 hours of playback.',
  },
  {
    category: 'electronics', slug: 'mechanical-keyboard', name: 'Low-Profile Mechanical Keyboard',
    priceCents: 13900, rating: 4.6, reviewCount: 274, stock: 38, isFeatured: false,
    imageUrl: img('1587829741301-dc798b83add3'),
    description: 'An aluminium 75% keyboard with hot-swappable tactile switches, PBT keycaps and wired or Bluetooth connectivity.',
  },
  {
    category: 'electronics', slug: 'studio-monitor-headphones', name: 'Studio Monitor Headphones',
    priceCents: 15900, rating: 4.6, reviewCount: 198, stock: 3, isFeatured: false,
    imageUrl: img('1583394838336-acd977736f90'),
    description: 'Closed-back headphones with 45 mm drivers tuned for accurate, detailed sound. Detachable cable and swivelling ear cups.',
  },

  // --- Beauty ----------------------------------------------------------
  {
    category: 'beauty', slug: 'cedar-and-fig-eau-de-parfum', name: 'Cedar & Fig Eau de Parfum',
    priceCents: 9800, rating: 4.5, reviewCount: 164, stock: 42, isFeatured: false,
    imageUrl: img('1541643600914-78b084683601'),
    description: 'A warm, woody fragrance with notes of green fig, cedarwood and vetiver. 50 ml glass bottle.',
  },
  {
    category: 'beauty', slug: 'hydrating-face-serum', name: 'Hydrating Face Serum',
    priceCents: 3800, rating: 4.6, reviewCount: 702, stock: 110, isFeatured: false,
    imageUrl: img('1620916566398-39f1143ab7be'),
    description: 'Hyaluronic acid and niacinamide in a lightweight, fragrance-free serum that layers well under moisturiser. 30 ml.',
  },
  {
    category: 'beauty', slug: 'daily-skincare-set', name: 'Daily Skincare Set',
    priceCents: 6400, rating: 4.4, reviewCount: 233, stock: 50, isFeatured: false,
    imageUrl: img('1556228578-8c89e6adf883'),
    description: 'A gentle cleanser, toner and moisturiser trio for a simple morning and evening routine. Suitable for all skin types.',
  },
  {
    category: 'beauty', slug: 'nourishing-body-oil', name: 'Nourishing Body Oil',
    priceCents: 3400, rating: 4.2, reviewCount: 88, stock: 64, isFeatured: false,
    imageUrl: img('1570194065650-d99fb4bedf0a'),
    description: 'Cold-pressed jojoba, sweet almond and rosehip oils that absorb quickly and leave skin soft, never greasy. 100 ml.',
  },
];

module.exports = { categories, products };
