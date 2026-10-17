import Dexie, { type Table } from 'dexie';

export interface StoreDef {
  id: string;
  name: string;
  code: string;
  description: string;
  adminPasswordHash?: {
    hash: string;
    salt: string;
  };
  createdAt: string;
}

export interface InventoryItem {
  id: string; // storeId:partNumber
  storeId: string;
  partNumber: string;
  description: string;
  location: string;
  quantity: number;
  threshold?: number;
  remarks?: string;
  updatedAt: string;
}

export interface HistoryRecord {
  id?: number;
  storeId?: string;
  ts: string;
  action: string;
  partNumber: string;
  description: string;
  qty: number | string;
  note?: string;
}

export interface AppSetting {
  key: string;
  value: any;
}

export class WLLabDatabase extends Dexie {
  stores!: Table<StoreDef, string>;
  inventory!: Table<InventoryItem, string>;
  history!: Table<HistoryRecord, number>;
  settings!: Table<AppSetting, string>;

  constructor() {
    super('WLLabInventoryDB');
    this.version(1).stores({
      stores: 'id, name, code, createdAt',
      inventory: 'id, storeId, partNumber, description, location, quantity, updatedAt',
      history: '++id, storeId, ts, action, partNumber',
      settings: 'key'
    });
  }
}

export const db = new WLLabDatabase();

export const DEFAULT_STORES: StoreDef[] = [
  {
    id: 'sonde-lab',
    name: 'Sonde Lab',
    code: 'SONDE',
    description: 'Sonde shop (Downhole tool sondes, acoustic mandrels, transducers & sensors)',
    createdAt: new Date().toISOString()
  },
  {
    id: 'e-lab',
    name: 'E-Lab',
    code: 'ELAB',
    description: 'Electronics shop (Telemetry cartridges, high-temp PCB electronics & cabling)',
    createdAt: new Date().toISOString()
  },
  {
    id: 'whe',
    name: 'WHE',
    code: 'WHE',
    description: 'Hardware & Equipment (Mechanical assemblies, cable heads, overshots & springs)',
    createdAt: new Date().toISOString()
  }
];

export const DEMO_REMARKS = 'DemoParts only/raynor';

function makeItem(storeId: string, partNumber: string, description: string, location: string, quantity: number, threshold: number): InventoryItem {
  return {
    id: `${storeId}:${partNumber}`,
    storeId,
    partNumber,
    description,
    location,
    quantity,
    threshold,
    remarks: DEMO_REMARKS,
    updatedAt: new Date().toISOString()
  };
}

export const INITIAL_INVENTORY_ITEMS: Record<string, InventoryItem[]> = {
  'sonde-lab': [
    makeItem('sonde-lab', 'OR-2-012', 'O-Ring', 'Shelf C-2', 0, 0),
    makeItem('sonde-lab', 'OR-2-118', 'O-Ring', 'Shelf A-2', 2, 4),
    makeItem('sonde-lab', 'OR-2-226', 'O-Ring', 'Cabinet F', 1, 3),
    makeItem('sonde-lab', 'OR-2-334', 'O-Ring', 'Rack S-1', 4, 2),
    makeItem('sonde-lab', 'OR-2-347', 'O-Ring', 'Cabinet S-3', 6, 3)
  ],
  'e-lab': [
    makeItem('e-lab', 'EL-2001', 'Resistor 10k Ohm 1/4W', 'ESD Bin 12', 3, 2),
    makeItem('e-lab', 'EL-2002', 'Ceramic Capacitor 100nF', 'Shelf E-4', 25, 10),
    makeItem('e-lab', 'EL-2003', 'Diode 1N4007', 'ESD Drawer 3', 5, 3),
    makeItem('e-lab', 'EL-2004', 'LED 5mm Red', 'Cabinet E-2', 2, 2),
    makeItem('e-lab', 'EL-2005', 'NPN Transistor 2N2222', 'Bin E-8', 40, 15)
  ],
  'whe': [
    makeItem('whe', 'PG-1001', 'Pressure Gauge 0-100 psi', 'Shelf A-1', 12, 0),
    makeItem('whe', 'PG-1002', 'Pressure Gauge 0-1,000 psi', 'Bin B-3', 3, 5),
    makeItem('whe', 'PG-1004', 'Pressure Gauge 0-5,000 psi', 'Rack D-7', 7, 3),
    makeItem('whe', 'PG-1006', 'Pressure Gauge 0-10,000 psi', 'Bin E-1', 15, 0),
    makeItem('whe', 'PG-1008', 'Pressure Gauge 0-15,000 psi', 'Shelf A-4', 8, 0)
  ]
};

export const STORE_PLACEHOLDERS: Record<string, string> = {
  'sonde-lab': 'e.g. O-Ring',
  'e-lab': 'e.g. Resistor 10k Ohm, Capacitor 100nF, Diode 1N4007',
  'whe': 'e.g. Pressure Gauge 0-5,000 psi'
};
