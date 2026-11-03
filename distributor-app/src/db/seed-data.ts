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
    route: "Adhartal Route #2",
    salesmanId: "USR-SALES-1",
    creditLimit: 30000,
    currentBalance: 5000,
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
    creditLimit: 40000,
    currentBalance: 0,
    creditHold: false,
    lastOrderAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // 18 days ago (DORMANT!)
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
    name: "Rajesh Kumar (Salesman)",
    role: "salesman",
    retailerId: undefined,
    active: true,
  },
];

export const SEED_SKUS: SeedSku[] = [
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
    id: "SKU-TE-250",
    code: "SKU-TE-250",
    name: "Tea leaf 250 g, case of 40",
    brand: "Wagh Bakri",
    category: "Tea",
    packSize: "250 g",
    unitsPerCase: 40,
    packPrice: 118.00,
    dealerPrice: 4720.00, // 40 * 118.00
    stockCases: 0, // Stock-out sample
    hsnCode: "09024020",
    gstRate: 5.0,
    schemeType: "NONE",
    active: true,
  },
];
