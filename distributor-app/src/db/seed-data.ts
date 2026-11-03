export interface SeedRetailer {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  address: string;
  route: string;
  salesmanId?: string;
  creditLimit: number;
  currentBalance: number;
  creditHold: boolean;
  lastOrderAt?: Date;
}

export interface SeedUser {
  id: string;
  phone: string;
  name: string;
  role: "retailer" | "salesman" | "desk";
  retailerId?: string;
  active: boolean;
}

export interface SeedSku {
  id: string;
  code: string;
  name: string;
  brand: string;
  category: string;
  packSize: string;
  unitsPerCase: number;
  dealerPrice: number; // Case price ex-GST
  packPrice: number; // Single pack rate
  stockCases: number;
  hsnCode: string;
  gstRate: number;
  schemeType: "NONE" | "FREE_GOODS" | "SLAB_DISCOUNT";
  schemeDetail?: {
    buyQty?: number;
    getFreeQty?: number;
    minCases?: number;
    discountPct?: number;
  };
  active: boolean;
}

export const SEED_RETAILERS: SeedRetailer[] = [
  {
    id: "RET-0001",
    name: "Sharma Kirana Store",
    ownerName: "Ramesh Sharma",
    phone: "9826000001",
    address: "Shop 14, Main Road, Napier Town, Jabalpur",
    route: "Napier Town Route #4",
    salesmanId: "USR-SALES-1",
    creditLimit: 50000,
    currentBalance: 12000,
    creditHold: false,
    lastOrderAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
  },
  {
    id: "RET-0002",
    name: "Verma General Store",
    ownerName: "Sunil Verma",
    phone: "9826000002",
    address: "Plot 8B, Adhartal Industrial Area, Jabalpur",
    route: "Adhartal Route #3",
    salesmanId: "USR-SALES-1",
    creditLimit: 45000,
    currentBalance: 8500,
    creditHold: false,
    lastOrderAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: "RET-0003",
    name: "Gupta Daily Needs",
    ownerName: "Alok Gupta",
    phone: "9826000003",
    address: "Near Gol Bazar, Gorakhpur, Jabalpur",
    route: "Gorakhpur Route #1",
    salesmanId: "USR-SALES-1",
    creditLimit: 60000,
    currentBalance: 0,
    creditHold: false,
    lastOrderAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // 18 days ago (Dormant > 14 days)
  },
  {
    id: "RET-0004",
    name: "Mahalaxmi Provision Store",
    ownerName: "Kailash Patel",
    phone: "9826000004",
    address: "Garha Main Market, Near Medical College, Jabalpur",
    route: "Garha Route #5",
    salesmanId: "USR-SALES-1",
    creditLimit: 75000,
    currentBalance: 32000,
    creditHold: false,
    lastOrderAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: "RET-0005",
    name: "Agrawal Super Mart",
    ownerName: "Vivek Agrawal",
    phone: "9826000005",
    address: "Commercial Complex, Civic Centre, Wright Town, Jabalpur",
    route: "Wright Town Route #2",
    salesmanId: "USR-SALES-1",
    creditLimit: 100000,
    currentBalance: 18000,
    creditHold: false,
    lastOrderAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: "RET-0006",
    name: "Sadar Grocery Hub",
    ownerName: "Sanjay Chouksey",
    phone: "9826000006",
    address: "Cantonment Board Market, Sadar, Jabalpur",
    route: "Cantt & Sadar Route #6",
    salesmanId: "USR-SALES-1",
    creditLimit: 40000,
    currentBalance: 15000,
    creditHold: false,
    lastOrderAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000), // 22 days ago (Dormant > 14 days)
  },
];

export const SEED_USERS: SeedUser[] = [
  {
    id: "USR-RET-1",
    phone: "9826000001",
    name: "Ramesh Sharma",
    role: "retailer",
    retailerId: "RET-0001",
    active: true,
  },
  {
    id: "USR-RET-2",
    phone: "9826000002",
    name: "Sunil Verma",
    role: "retailer",
    retailerId: "RET-0002",
    active: true,
  },
  {
    id: "USR-RET-3",
    phone: "9826000003",
    name: "Alok Gupta",
    role: "retailer",
    retailerId: "RET-0003",
    active: true,
  },
  {
    id: "USR-RET-4",
    phone: "9826000004",
    name: "Kailash Patel",
    role: "retailer",
    retailerId: "RET-0004",
    active: true,
  },
  {
    id: "USR-RET-5",
    phone: "9826000005",
    name: "Vivek Agrawal",
    role: "retailer",
    retailerId: "RET-0005",
    active: true,
  },
  {
    id: "USR-RET-6",
    phone: "9826000006",
    name: "Sanjay Chouksey",
    role: "retailer",
    retailerId: "RET-0006",
    active: true,
  },
  {
    id: "USR-DESK-1",
    phone: "9826000099",
    name: "Amit Jain (Order Desk)",
    role: "desk",
    retailerId: undefined,
    active: true,
  },
  {
    id: "USR-SALES-1",
    phone: "9826000018",
    name: "Rajesh Kumar (Field Sales Beat #4)",
    role: "salesman",
    retailerId: undefined,
    active: true,
  },
];

export const SEED_SKUS: SeedSku[] = [
  // 1. Biscuits & Packaged Food
  {
    id: "SKU-BS-075",
    code: "SKU-BS-075",
    name: "Glucose biscuit 75 g, case of 96",
    brand: "Parle",
    category: "Biscuits",
    packSize: "75 g",
    unitsPerCase: 96,
    packPrice: 8.10,
    dealerPrice: 777.60, // 96 * 8.10
    stockCases: 340,
    hsnCode: "19053100",
    gstRate: 18.0,
    schemeType: "FREE_GOODS",
    schemeDetail: {
      buyQty: 10,
      getFreeQty: 1,
    },
    active: true,
  },
  {
    id: "SKU-BS-GD120",
    code: "SKU-BS-GD120",
    name: "Good Day Butter Cookies 120 g, case of 48",
    brand: "Britannia",
    category: "Biscuits",
    packSize: "120 g",
    unitsPerCase: 48,
    packPrice: 28.00,
    dealerPrice: 1344.00, // 48 * 28.00
    stockCases: 160,
    hsnCode: "19053100",
    gstRate: 18.0,
    schemeType: "SLAB_DISCOUNT",
    schemeDetail: {
      minCases: 4,
      discountPct: 5.0,
    },
    active: true,
  },
  {
    id: "SKU-BS-MG250",
    code: "SKU-BS-MG250",
    name: "Marie Gold Tea Biscuit 250 g, case of 36",
    brand: "Britannia",
    category: "Biscuits",
    packSize: "250 g",
    unitsPerCase: 36,
    packPrice: 36.00,
    dealerPrice: 1296.00, // 36 * 36.00
    stockCases: 95,
    hsnCode: "19053100",
    gstRate: 18.0,
    schemeType: "NONE",
    active: true,
  },

  // 2. Detergents & Laundry
  {
    id: "SKU-DT-1KG",
    code: "SKU-DT-1KG",
    name: "Detergent powder 1 kg, case of 20",
    brand: "Ghadi",
    category: "Detergent",
    packSize: "1 kg",
    unitsPerCase: 20,
    packPrice: 101.50,
    dealerPrice: 2030.00, // 20 * 101.50
    stockCases: 85,
    hsnCode: "34029011",
    gstRate: 18.0,
    schemeType: "SLAB_DISCOUNT",
    schemeDetail: {
      minCases: 5,
      discountPct: 3.0,
    },
    active: true,
  },
  {
    id: "SKU-DT-SX1KG",
    code: "SKU-DT-SX1KG",
    name: "Surf Excel Quick Wash 1 kg, case of 16",
    brand: "HUL",
    category: "Detergent",
    packSize: "1 kg",
    unitsPerCase: 16,
    packPrice: 170.00,
    dealerPrice: 2720.00,
    stockCases: 54,
    hsnCode: "34029011",
    gstRate: 18.0,
    schemeType: "NONE",
    active: true,
  },
  {
    id: "SKU-DT-CK250",
    code: "SKU-DT-CK250",
    name: "Ghadi Detergent Cake 250 g, case of 80",
    brand: "Ghadi",
    category: "Detergent",
    packSize: "250 g",
    unitsPerCase: 80,
    packPrice: 18.00,
    dealerPrice: 1440.00,
    stockCases: 110,
    hsnCode: "34011941",
    gstRate: 18.0,
    schemeType: "FREE_GOODS",
    schemeDetail: {
      buyQty: 8,
      getFreeQty: 1,
    },
    active: true,
  },

  // 3. Tea & Beverages (5% GST)
  {
    id: "SKU-TE-250",
    code: "SKU-TE-250",
    name: "Tea leaf 250 g, case of 40",
    brand: "Wagh Bakri",
    category: "Tea",
    packSize: "250 g",
    unitsPerCase: 40,
    packPrice: 118.00,
    dealerPrice: 4720.00, // 40 * 118.00
    stockCases: 0, // Stock-out sample for notification telemetry
    hsnCode: "09024020",
    gstRate: 5.0,
    schemeType: "NONE",
    active: true,
  },
  {
    id: "SKU-TE-TT500",
    code: "SKU-TE-TT500",
    name: "Tata Tea Gold 500 g, case of 24",
    brand: "Tata",
    category: "Tea",
    packSize: "500 g",
    unitsPerCase: 24,
    packPrice: 270.00,
    dealerPrice: 6480.00,
    stockCases: 42,
    hsnCode: "09024020",
    gstRate: 5.0,
    schemeType: "SLAB_DISCOUNT",
    schemeDetail: {
      minCases: 3,
      discountPct: 4.0,
    },
    active: true,
  },

  // 4. Personal Care & Soaps
  {
    id: "SKU-PC-DT125",
    code: "SKU-PC-DT125",
    name: "Dettol Original Bathing Soap 125 g, case of 72",
    brand: "Reckitt",
    category: "Personal Care",
    packSize: "125 g",
    unitsPerCase: 72,
    packPrice: 40.00,
    dealerPrice: 2880.00,
    stockCases: 68,
    hsnCode: "34011110",
    gstRate: 18.0,
    schemeType: "SLAB_DISCOUNT",
    schemeDetail: {
      minCases: 6,
      discountPct: 4.0,
    },
    active: true,
  },
  {
    id: "SKU-PC-LB100",
    code: "SKU-PC-LB100",
    name: "Lifebuoy Total Germ Protection Soap 100 g, case of 96",
    brand: "HUL",
    category: "Personal Care",
    packSize: "100 g",
    unitsPerCase: 96,
    packPrice: 28.00,
    dealerPrice: 2688.00,
    stockCases: 80,
    hsnCode: "34011110",
    gstRate: 18.0,
    schemeType: "NONE",
    active: true,
  },

  // 5. Cooking Oil & Staple (5% GST)
  {
    id: "SKU-OL-FT1L",
    code: "SKU-OL-FT1L",
    name: "Fortune Refined Sunlite Oil 1 L pouch, case of 15",
    brand: "Adani Wilmar",
    category: "Cooking Oil",
    packSize: "1 L",
    unitsPerCase: 15,
    packPrice: 130.00,
    dealerPrice: 1950.00,
    stockCases: 125,
    hsnCode: "15121910",
    gstRate: 5.0,
    schemeType: "FREE_GOODS",
    schemeDetail: {
      buyQty: 10,
      getFreeQty: 1,
    },
    active: true,
  },
  {
    id: "SKU-ND-MG70",
    code: "SKU-ND-MG70",
    name: "Maggi 2-Minute Masala Noodles 70 g, case of 96",
    brand: "Nestle",
    category: "Packaged Foods",
    packSize: "70 g",
    unitsPerCase: 96,
    packPrice: 13.00,
    dealerPrice: 1248.00,
    stockCases: 140,
    hsnCode: "19023010",
    gstRate: 18.0,
    schemeType: "NONE",
    active: true,
  },
];
